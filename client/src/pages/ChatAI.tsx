import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useVip } from "@/contexts/VipContext";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  timestamp: Date;
}

const MODELS = [
  { id: "auto", label: "AUTO", description: "Best available", icon: "◈" },
  { id: "claude", label: "CLAUDE", description: "Anthropic", icon: "◉" },
  { id: "gemini", label: "GEMINI", description: "Google", icon: "◎" },
  { id: "gpt", label: "GPT-4o", description: "OpenAI", icon: "◇" },
  { id: "mistral", label: "MISTRAL", description: "Mistral AI", icon: "◆" },
];

export default function ChatAI() {
  const { sessionToken } = useVip();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = trpc.chat.sendMessage.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Add placeholder assistant message
    const placeholderMsg: Message = {
      role: "assistant",
      content: "",
      model: selectedModel,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, placeholderMsg]);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await sendMessage.mutateAsync({
        messages: apiMessages,
        model: selectedModel,
        sessionToken: sessionToken || undefined,
      });

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: result.content,
            model: selectedModel,
          };
        }
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: "⚠ NEURAL LINK ERROR — Failed to reach AI gateway. Check connection.",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4" style={{ height: "calc(100vh - 57px)" }}>
      {/* Model selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground tracking-wider">MODEL:</span>
        {MODELS.map(model => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border transition-all duration-200 ${
              selectedModel === model.id
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
            }`}
          >
            <span>{model.icon}</span>
            <span className="tracking-wider font-bold">{model.label}</span>
            <span className="text-[10px] opacity-60 hidden sm:inline">{model.description}</span>
          </button>
        ))}
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="ml-auto text-xs text-muted-foreground hover:text-red-400 transition-colors px-2 py-1 border border-transparent hover:border-red-900/40 rounded-sm"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto cyber-card border-neon-green p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-4xl neon-green opacity-30">◈</div>
            <div className="text-muted-foreground text-sm">
              <div className="neon-cyan mb-2">TAUROS AI GATEWAY READY</div>
              <div className="text-xs opacity-60">Select a model and begin your session</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-muted-foreground max-w-sm">
              {["Analyze malware behavior", "Explain CVE-2024-XXXX", "Write a Python exploit PoC", "OSINT on a domain"].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="p-2 border border-border/50 rounded-sm hover:border-primary/40 hover:text-foreground transition-all text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div
              className={`w-7 h-7 flex-shrink-0 flex items-center justify-center text-xs rounded-sm border ${
                msg.role === "user"
                  ? "border-cyan-500/40 text-cyan-400 bg-cyan-950/20"
                  : "border-primary/40 text-primary bg-primary/10"
              }`}
            >
              {msg.role === "user" ? "YOU" : "AI"}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {msg.role === "assistant" && msg.model && (
                  <span className="neon-green opacity-60 uppercase">{msg.model}</span>
                )}
                <span>{msg.timestamp.toLocaleTimeString("en-US", { hour12: false })}</span>
              </div>
              <div
                className={`max-w-full rounded-sm p-3 text-sm ${
                  msg.role === "user"
                    ? "bg-cyan-950/20 border border-cyan-500/20 text-cyan-100"
                    : "cyber-card border-primary/20 text-foreground"
                }`}
              >
                {msg.role === "assistant" && !msg.content && isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-block w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="neon-green">Processing neural query...</span>
                  </div>
                ) : msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="cyber-card border-neon-cyan p-3">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-3 text-xs neon-green">›</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command or query... (Enter to send, Shift+Enter for newline)"
              className="cyber-input w-full pl-7 pr-4 py-2.5 text-sm resize-none rounded-sm min-h-[44px] max-h-32"
              rows={1}
              disabled={isLoading}
              style={{ height: "auto" }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="btn-neon px-4 py-2.5 text-xs rounded-sm disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              "SEND ▶"
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>ACTIVE MODEL: <span className="neon-green">{MODELS.find(m => m.id === selectedModel)?.label}</span></span>
          <span>{messages.filter(m => m.role === "user").length} queries this session</span>
        </div>
      </div>
    </div>
  );
}
