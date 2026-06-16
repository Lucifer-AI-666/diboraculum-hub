import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useVip } from "@/contexts/VipContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentLog {
  id: string;
  type: "info" | "success" | "error" | "warning" | "action" | "ai" | "user";
  message: string;
  timestamp: Date;
}

interface FsEntry {
  name: string;
  kind: "file" | "directory";
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  path: string;
}

interface AgentTask {
  id: string;
  prompt: string;
  status: "pending" | "running" | "done" | "error";
  logs: AgentLog[];
  createdAt: Date;
}

// ─── File System Access API helpers ──────────────────────────────────────────

async function listDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path = ""
): Promise<FsEntry[]> {
  const entries: FsEntry[] = [];
  for await (const [name, handle] of dirHandle as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    entries.push({ name, kind: handle.kind as "file" | "directory", handle: handle as FileSystemFileHandle | FileSystemDirectoryHandle, path: path ? `${path}/${name}` : name });
  }
  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function readFileContent(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

async function writeFileContent(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function createFile(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  content = ""
): Promise<FileSystemFileHandle> {
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  if (content) await writeFileContent(fileHandle, content);
  return fileHandle;
}

async function createDirectory(
  dirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return dirHandle.getDirectoryHandle(name, { create: true });
}

async function deleteEntry(
  dirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<void> {
  await dirHandle.removeEntry(name, { recursive: true });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAgent() {
  const { sessionToken } = useVip();
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentDirHandle, setCurrentDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [tab, setTab] = useState<"agent" | "explorer">("agent");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const planTask = trpc.agent.planTask.useMutation();

  const addLog = useCallback((taskId: string, log: Omit<AgentLog, "id" | "timestamp">) => {
    const entry: AgentLog = { ...log, id: Math.random().toString(36).slice(2), timestamp: new Date() };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, logs: [...t.logs, entry] } : t));
    return entry;
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tasks]);

  // ── Filesystem operations ──────────────────────────────────────────────────

  const requestAccess = async () => {
    try {
      const handle = await (window as unknown as { showDirectoryPicker: (opts?: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
        mode: "readwrite",
      });
      setRootHandle(handle);
      setCurrentDirHandle(handle);
      setCurrentPath([handle.name]);
      const list = await listDirectory(handle);
      setEntries(list);
      addSystemLog(`✓ Access granted to: ${handle.name}`, "success");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        addSystemLog(`✗ Access denied: ${(err as Error).message}`, "error");
      }
    }
  };

  const [systemLogs, setSystemLogs] = useState<AgentLog[]>([]);
  const addSystemLog = (message: string, type: AgentLog["type"] = "info") => {
    setSystemLogs(prev => [...prev, { id: Math.random().toString(36).slice(2), type, message, timestamp: new Date() }]);
  };

  const navigateTo = async (entry: FsEntry) => {
    if (entry.kind !== "directory") return;
    const dirHandle = entry.handle as FileSystemDirectoryHandle;
    setCurrentDirHandle(dirHandle);
    setCurrentPath(prev => [...prev, entry.name]);
    const list = await listDirectory(dirHandle, entry.path);
    setEntries(list);
  };

  const navigateUp = async () => {
    if (currentPath.length <= 1 || !rootHandle) return;
    const newPath = currentPath.slice(0, -1);
    setCurrentPath(newPath);
    // Re-traverse from root
    let dir: FileSystemDirectoryHandle = rootHandle;
    for (const segment of newPath.slice(1)) {
      dir = await dir.getDirectoryHandle(segment);
    }
    setCurrentDirHandle(dir);
    const list = await listDirectory(dir);
    setEntries(list);
  };

  const refreshDir = async () => {
    if (!currentDirHandle) return;
    const list = await listDirectory(currentDirHandle);
    setEntries(list);
  };

  // ── Agent execution ────────────────────────────────────────────────────────

  const executeTask = async (taskId: string, taskPrompt: string) => {
    if (!currentDirHandle) {
      addLog(taskId, { type: "error", message: "No directory access. Grant filesystem access first." });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "error" } : t));
      return;
    }

    setIsRunning(true);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "running" } : t));

    addLog(taskId, { type: "ai", message: `Analyzing task: "${taskPrompt}"` });

    try {
      // Get current directory listing for context
      const currentEntries = await listDirectory(currentDirHandle);
      const dirContext = currentEntries.map(e => `${e.kind === "directory" ? "📁" : "📄"} ${e.name}`).join("\n");

      addLog(taskId, { type: "info", message: `Current directory: ${currentPath.join("/")}` });
      addLog(taskId, { type: "info", message: `Files found: ${currentEntries.length} entries` });

      // Ask AI to plan the task
      const plan = await planTask.mutateAsync({
        prompt: taskPrompt,
        directoryContext: dirContext,
        currentPath: currentPath.join("/"),
        sessionToken: sessionToken || undefined,
      });

      addLog(taskId, { type: "ai", message: `Plan generated: ${plan.summary}` });

      // Execute each step
      for (const step of plan.steps) {
        addLog(taskId, { type: "action", message: `→ ${step.description}` });

        try {
          switch (step.action) {
            case "create_file": {
              const handle = await createFile(currentDirHandle, step.name!, step.content || "");
              addLog(taskId, { type: "success", message: `✓ Created file: ${step.name}` });
              break;
            }
            case "create_directory": {
              await createDirectory(currentDirHandle, step.name!);
              addLog(taskId, { type: "success", message: `✓ Created folder: ${step.name}` });
              break;
            }
            case "write_file": {
              // Find existing file
              const fileHandle = await currentDirHandle.getFileHandle(step.name!);
              await writeFileContent(fileHandle, step.content || "");
              addLog(taskId, { type: "success", message: `✓ Written to: ${step.name} (${(step.content || "").length} chars)` });
              break;
            }
            case "read_file": {
              const fileHandle = await currentDirHandle.getFileHandle(step.name!);
              const content = await readFileContent(fileHandle);
              addLog(taskId, { type: "success", message: `✓ Read: ${step.name} — ${content.length} chars` });
              break;
            }
            case "delete": {
              await deleteEntry(currentDirHandle, step.name!);
              addLog(taskId, { type: "success", message: `✓ Deleted: ${step.name}` });
              break;
            }
            case "move": {
              // Read source, write to dest, delete source
              const srcHandle = await currentDirHandle.getFileHandle(step.name!);
              const content = await readFileContent(srcHandle);
              await createFile(currentDirHandle, step.destination!, content);
              await deleteEntry(currentDirHandle, step.name!);
              addLog(taskId, { type: "success", message: `✓ Moved: ${step.name} → ${step.destination}` });
              break;
            }
            default:
              addLog(taskId, { type: "warning", message: `? Unknown action: ${step.action}` });
          }
        } catch (stepErr: unknown) {
          addLog(taskId, { type: "error", message: `✗ Step failed: ${(stepErr as Error).message}` });
        }

        // Small delay between steps for readability
        await new Promise(r => setTimeout(r, 200));
      }

      await refreshDir();
      addLog(taskId, { type: "success", message: `✓ Task completed: ${plan.steps.length} operations executed` });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "done" } : t));
    } catch (err: unknown) {
      addLog(taskId, { type: "error", message: `✗ Agent error: ${(err as Error).message}` });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "error" } : t));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isRunning) return;
    const taskId = Math.random().toString(36).slice(2);
    const task: AgentTask = {
      id: taskId,
      prompt: prompt.trim(),
      status: "pending",
      logs: [],
      createdAt: new Date(),
    };
    setTasks(prev => [...prev, task]);
    setActiveTask(taskId);
    setPrompt("");
    await executeTask(taskId, task.prompt);
  };

  const currentTask = tasks.find(t => t.id === activeTask);

  const LOG_COLORS: Record<AgentLog["type"], string> = {
    info: "text-muted-foreground",
    success: "neon-green",
    error: "neon-red",
    warning: "text-yellow-400",
    action: "neon-cyan",
    ai: "neon-purple",
    user: "text-foreground",
  };

  const LOG_ICONS: Record<AgentLog["type"], string> = {
    info: "·",
    success: "✓",
    error: "✗",
    warning: "⚠",
    action: "→",
    ai: "◈",
    user: "›",
  };

  const isApiSupported = "showDirectoryPicker" in window;

  return (
    <div className="h-full flex flex-col p-4 gap-4" style={{ height: "calc(100vh - 57px)" }}>
      {/* Header */}
      <div className="cyber-card border-neon-purple p-4 flex items-center gap-4">
        <div className="text-3xl neon-purple">◈</div>
        <div>
          <div className="font-bold tracking-widest neon-purple" style={{ fontFamily: "'Orbitron', monospace" }}>
            AI AGENT — FILESYSTEM OPERATOR
          </div>
          <div className="text-xs text-muted-foreground">Autonomous agent with read/write access to your device</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {rootHandle ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="status-dot online" />
              <span className="neon-green font-mono">{currentPath.join(" / ")}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No directory selected</span>
          )}
          <button
            onClick={requestAccess}
            disabled={!isApiSupported}
            className="btn-neon px-4 py-2 text-xs rounded-sm disabled:opacity-40"
            style={{ borderColor: "oklch(0.65 0.20 280 / 0.6)", color: "oklch(0.65 0.20 280)" }}
          >
            {rootHandle ? "CHANGE DIR" : "GRANT ACCESS"}
          </button>
        </div>
      </div>

      {!isApiSupported && (
        <div className="cyber-card border-yellow-900/40 p-3 text-xs text-yellow-400">
          ⚠ File System Access API not supported in this browser. Use Chrome/Edge on desktop for full functionality.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1">
        {(["agent", "explorer"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs rounded-sm border transition-all tracking-wider font-bold ${
              tab === t
                ? "border-purple-500/60 bg-purple-950/20 neon-purple"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "agent" ? "◈ AGENT TERMINAL" : "◎ FILE EXPLORER"}
          </button>
        ))}
      </div>

      {/* Agent Terminal */}
      {tab === "agent" && (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Task list */}
          <div className="w-56 flex-shrink-0 flex flex-col gap-2">
            <div className="text-xs text-muted-foreground tracking-wider">TASK QUEUE</div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {tasks.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No tasks yet</div>
              )}
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => setActiveTask(task.id)}
                  className={`w-full text-left p-2 rounded-sm border text-xs transition-all ${
                    activeTask === task.id
                      ? "border-purple-500/40 bg-purple-950/20"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={
                      task.status === "done" ? "neon-green" :
                      task.status === "error" ? "neon-red" :
                      task.status === "running" ? "neon-cyan" : "text-muted-foreground"
                    }>
                      {task.status === "done" ? "✓" : task.status === "error" ? "✗" : task.status === "running" ? "⟳" : "○"}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{task.status}</span>
                  </div>
                  <div className="text-foreground truncate">{task.prompt}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {task.createdAt.toLocaleTimeString("en-US", { hour12: false })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Log terminal */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            <div
              className="flex-1 cyber-card border-neon-purple p-4 overflow-y-auto font-mono text-xs space-y-1 min-h-0"
              style={{ background: "oklch(0.04 0.01 240)" }}
            >
              {/* System logs */}
              {systemLogs.map(log => (
                <div key={log.id} className={`flex items-start gap-2 ${LOG_COLORS[log.type]}`}>
                  <span className="flex-shrink-0 opacity-60">{log.timestamp.toLocaleTimeString("en-US", { hour12: false })}</span>
                  <span className="flex-shrink-0">{LOG_ICONS[log.type]}</span>
                  <span>{log.message}</span>
                </div>
              ))}

              {/* Task logs */}
              {currentTask?.logs.map(log => (
                <div key={log.id} className={`flex items-start gap-2 ${LOG_COLORS[log.type]}`}>
                  <span className="flex-shrink-0 opacity-60">{log.timestamp.toLocaleTimeString("en-US", { hour12: false })}</span>
                  <span className="flex-shrink-0">{LOG_ICONS[log.type]}</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))}

              {!currentTask && systemLogs.length === 0 && (
                <div className="text-muted-foreground text-center py-8">
                  <div className="text-2xl mb-2 neon-purple">◈</div>
                  <div>AGENT READY — Grant filesystem access and describe a task</div>
                  <div className="mt-3 text-[10px] space-y-1 opacity-60">
                    <div>Examples: "Create a project folder with README and src/"</div>
                    <div>"Organize all .txt files into a notes/ folder"</div>
                    <div>"Create a Python script that prints Hello World"</div>
                  </div>
                </div>
              )}

              {isRunning && (
                <div className="flex items-center gap-2 neon-cyan">
                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  <span>Agent operating...</span>
                </div>
              )}

              <div ref={logsEndRef} />
            </div>

            {/* Input */}
            <div className="cyber-card border-neon-purple p-3">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-3 text-xs neon-purple">AGENT›</span>
                  <textarea
                    ref={promptRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                    }}
                    placeholder="Describe what the agent should do with your files..."
                    className="cyber-input w-full pl-16 pr-4 py-2.5 text-sm resize-none rounded-sm min-h-[44px] max-h-32"
                    rows={1}
                    disabled={isRunning}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 128) + "px";
                    }}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isRunning || !prompt.trim() || !rootHandle}
                  className="btn-neon px-4 py-2.5 text-xs rounded-sm disabled:opacity-40 flex-shrink-0"
                  style={{ borderColor: "oklch(0.65 0.20 280 / 0.6)", color: "oklch(0.65 0.20 280)" }}
                >
                  {isRunning ? (
                    <span className="inline-block w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : "RUN ▶"}
                </button>
              </div>
              {!rootHandle && (
                <div className="text-[10px] text-yellow-400 mt-2">⚠ Grant filesystem access before running tasks</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Explorer */}
      {tab === "explorer" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs">
            {currentPath.map((segment, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground">/</span>}
                <span className={i === currentPath.length - 1 ? "neon-cyan" : "text-muted-foreground"}>{segment}</span>
              </span>
            ))}
            {rootHandle && (
              <div className="ml-auto flex gap-2">
                {currentPath.length > 1 && (
                  <button onClick={navigateUp} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border border-border/40 rounded-sm">
                    ↑ UP
                  </button>
                )}
                <button onClick={refreshDir} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border border-border/40 rounded-sm">
                  ↻ REFRESH
                </button>
              </div>
            )}
          </div>

          {!rootHandle ? (
            <div className="flex-1 cyber-card flex flex-col items-center justify-center gap-4 text-center">
              <div className="text-4xl neon-purple opacity-30">◎</div>
              <div className="text-muted-foreground text-sm">
                <div className="neon-cyan mb-2">NO DIRECTORY SELECTED</div>
                <div className="text-xs opacity-60">Grant filesystem access to browse your device</div>
              </div>
              <button
                onClick={requestAccess}
                disabled={!isApiSupported}
                className="btn-neon px-6 py-2 text-xs rounded-sm disabled:opacity-40"
                style={{ borderColor: "oklch(0.65 0.20 280 / 0.6)", color: "oklch(0.65 0.20 280)" }}
              >
                GRANT FILESYSTEM ACCESS
              </button>
            </div>
          ) : (
            <div className="flex-1 cyber-card overflow-y-auto">
              {entries.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-8">Empty directory</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left px-4 py-2 text-muted-foreground tracking-wider font-normal">NAME</th>
                      <th className="text-left px-4 py-2 text-muted-foreground tracking-wider font-normal">TYPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => (
                      <tr
                        key={entry.name}
                        className={`border-b border-border/20 transition-colors ${
                          entry.kind === "directory"
                            ? "hover:bg-cyan-950/20 cursor-pointer"
                            : "hover:bg-muted/20"
                        }`}
                        onClick={() => entry.kind === "directory" && navigateTo(entry)}
                      >
                        <td className="px-4 py-2.5 flex items-center gap-2">
                          <span className={entry.kind === "directory" ? "neon-cyan" : "text-muted-foreground"}>
                            {entry.kind === "directory" ? "📁" : "📄"}
                          </span>
                          <span className={entry.kind === "directory" ? "neon-cyan font-bold" : "text-foreground"}>
                            {entry.name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground uppercase">
                          {entry.kind === "directory" ? "DIR" : entry.name.split(".").pop()?.toUpperCase() || "FILE"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
