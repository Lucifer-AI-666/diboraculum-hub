import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod/v4";
import { verifyVipCode, createVipSession, validateVipSession, revokeVipSession } from "./vip";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { chatHistory, threatLogs } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// VIP session cookie name
const VIP_COOKIE = "dib_vip_session";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // VIP Authentication
  vip: router({
    login: publicProcedure
      .input(z.object({ code: z.string().min(1).max(64) }))
      .mutation(async ({ input, ctx }) => {
        const valid = verifyVipCode(input.code);
        if (!valid) {
          return { success: false, error: "ACCESS_DENIED" };
        }

        const ip = ctx.req.headers["x-forwarded-for"] as string || ctx.req.socket?.remoteAddress;
        const ua = ctx.req.headers["user-agent"] as string;
        const token = await createVipSession(ip, ua);

        // Set VIP session cookie
        ctx.res.cookie(VIP_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 24 * 60 * 60 * 1000, // 24h
        });

        // Notify owner of new VIP login
        await notifyOwner({
          title: "🔐 VIP Login",
          content: `New VIP session started from ${ip || "unknown"}`,
        }).catch(() => {});

        return { success: true, token };
      }),

    verify: publicProcedure.query(async ({ ctx }) => {
      const token = ctx.req.cookies?.[VIP_COOKIE];
      if (!token) return { authenticated: false };
      const valid = await validateVipSession(token);
      return { authenticated: valid };
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.cookies?.[VIP_COOKIE];
      if (token) {
        await revokeVipSession(token);
        ctx.res.clearCookie(VIP_COOKIE, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
        });
      }
      return { success: true };
    }),
  }),

  // Chat AI procedures
  chat: router({
    getHistory: publicProcedure
      .input(z.object({ sessionToken: z.string(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(chatHistory)
          .where(eq(chatHistory.sessionToken, input.sessionToken))
          .orderBy(desc(chatHistory.createdAt))
          .limit(input.limit);
      }),

    saveMessage: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        model: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.insert(chatHistory).values(input);
        return { success: true };
      }),

    sendMessage: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })),
        model: z.string().default("auto"),
        sessionToken: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const modelMap: Record<string, string> = {
          "mistral": "mistral-large-latest",
          "claude": "claude-sonnet-4-5",
          "gemini": "gemini-2.5-flash",
          "gpt": "gpt-4o",
          "auto": "claude-sonnet-4-5",
        };

        const modelId = modelMap[input.model] || input.model;

        const systemPrompt = {
          role: "system" as const,
          content: `You are TAUROS, an advanced AI assistant integrated into the Diboraculum Hub — a personal command center for AI, cybersecurity, and offensive intelligence operations. You are precise, technical, and efficient. Respond in the same language as the user. Format responses in Markdown when appropriate.`,
        };

        const response = await invokeLLM({
          model: modelId,
          messages: [systemPrompt, ...input.messages],
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent) || "";

        // Save to history if session token provided
        if (input.sessionToken) {
          const db = await getDb();
          if (db) {
            const lastUserMsg = input.messages[input.messages.length - 1];
            if (lastUserMsg?.role === "user") {
              const msgContent = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg.content);
              await db.insert(chatHistory).values({
                sessionToken: input.sessionToken,
                model: input.model,
                role: "user",
                content: msgContent,
              });
            }
            await db.insert(chatHistory).values({
              sessionToken: input.sessionToken,
              model: input.model,
              role: "assistant",
              content,
            });
          }
        }

        return { content, model: modelId };
      }),
  }),

  // Tauros Sentinel procedures
  sentinel: router({
    scanUrl: publicProcedure
      .input(z.object({ url: z.string(), sessionToken: z.string().optional() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a cybersecurity expert specializing in threat analysis. Analyze URLs for phishing, malware, and security threats. Always respond in JSON format with: { "riskLevel": "safe|low|medium|high|critical", "threats": [], "indicators": [], "recommendation": "", "details": "" }`,
            },
            {
              role: "user",
              content: `Analyze this URL for security threats: ${input.url}\n\nProvide a detailed security assessment including phishing indicators, malicious patterns, domain reputation signals, and tracking parameters.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        let result: Record<string, unknown>;
        try {
          const rawRes1 = response.choices[0]?.message?.content;
          const resStr1 = typeof rawRes1 === 'string' ? rawRes1 : JSON.stringify(rawRes1) || "{}";
          result = JSON.parse(resStr1);
        } catch {
          const rawFallback1 = response.choices[0]?.message?.content;
          result = { riskLevel: "medium", details: typeof rawFallback1 === 'string' ? rawFallback1 : '' };
        }

        // Log to DB
        const db = await getDb();
        if (db) {
          await db.insert(threatLogs).values({
            type: "url_scan",
            target: input.url,
            result: JSON.stringify(result),
            riskLevel: (result.riskLevel as "safe" | "low" | "medium" | "high" | "critical") || "medium",
            sessionToken: input.sessionToken,
          });
        }

        return result;
      }),

    analyzeApk: publicProcedure
      .input(z.object({ packageName: z.string(), manifest: z.string().optional(), sessionToken: z.string().optional() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an Android security expert specializing in APK forensics. Analyze Android package information for malicious behavior, dangerous permissions, and security risks. Respond in JSON: { "riskLevel": "safe|low|medium|high|critical", "dangerousPermissions": [], "suspiciousPatterns": [], "spywareIndicators": [], "recommendation": "", "details": "" }`,
            },
            {
              role: "user",
              content: `Analyze this Android package:\nPackage: ${input.packageName}\n${input.manifest ? `Manifest:\n${input.manifest}` : ""}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        let result: Record<string, unknown>;
        try {
          const rawRes2 = response.choices[0]?.message?.content;
          const resStr2 = typeof rawRes2 === 'string' ? rawRes2 : JSON.stringify(rawRes2) || "{}";
          result = JSON.parse(resStr2);
        } catch {
          const rawFallback2 = response.choices[0]?.message?.content;
          result = { riskLevel: "medium", details: typeof rawFallback2 === 'string' ? rawFallback2 : '' };
        }

        const db = await getDb();
        if (db) {
          await db.insert(threatLogs).values({
            type: "apk_analysis",
            target: input.packageName,
            result: JSON.stringify(result),
            riskLevel: (result.riskLevel as "safe" | "low" | "medium" | "high" | "critical") || "medium",
            sessionToken: input.sessionToken,
          });
        }

        return result;
      }),

    getThreatFeed: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(threatLogs)
          .orderBy(desc(threatLogs.createdAt))
          .limit(input.limit);
      }),

    generateThreatIntel: publicProcedure
      .input(z.object({ topic: z.string() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a threat intelligence analyst. Provide detailed, technical threat intelligence briefings. Be specific and actionable.",
            },
            {
              role: "user",
              content: `Generate a threat intelligence briefing about: ${input.topic}`,
            },
          ],
        });
        const tiContent = response.choices[0]?.message?.content;
        return { content: typeof tiContent === 'string' ? tiContent : '' };
      }),
  }),

  // Oraculum OSINT procedures
  oraculum: router({
    osintSearch: publicProcedure
      .input(z.object({ target: z.string(), type: z.enum(["person", "domain", "ip", "email", "username"]) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "claude-sonnet-4-5",
          messages: [
            {
              role: "system",
              content: `You are an OSINT (Open Source Intelligence) expert. Provide comprehensive intelligence gathering strategies and known public information about targets. Always clarify this is for educational/defensive purposes. Format as JSON: { "summary": "", "publicInfo": [], "searchVectors": [], "relatedEntities": [], "recommendations": [] }`,
            },
            {
              role: "user",
              content: `OSINT analysis for ${input.type}: ${input.target}\n\nProvide intelligence gathering strategies, public information sources, and related entities.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        let result: Record<string, unknown>;
        try {
          const rawRes3 = response.choices[0]?.message?.content;
          const resStr3 = typeof rawRes3 === 'string' ? rawRes3 : JSON.stringify(rawRes3) || "{}";
          result = JSON.parse(resStr3);
        } catch {
          const rawFallback3 = response.choices[0]?.message?.content;
          result = { summary: typeof rawFallback3 === 'string' ? rawFallback3 : '' };
        }

        const db = await getDb();
        if (db) {
          await db.insert(threatLogs).values({
            type: "osint",
            target: `${input.type}:${input.target}`,
            result: JSON.stringify(result),
            riskLevel: "safe",
          });
        }

        return result;
      }),

    crackHash: publicProcedure
      .input(z.object({ hash: z.string(), algorithm: z.enum(["md5", "sha1", "sha256", "unknown"]) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "claude-sonnet-4-5",
          messages: [
            {
              role: "system",
              content: `You are a cryptography expert. Analyze hash values and provide information about the algorithm, potential weaknesses, and known rainbow table matches for common passwords. Format as JSON: { "algorithm": "", "identified": false, "possibleValue": "", "method": "", "confidence": "low|medium|high", "notes": "" }`,
            },
            {
              role: "user",
              content: `Analyze this hash (algorithm hint: ${input.algorithm}): ${input.hash}\n\nIdentify the algorithm if unknown, check for common password hashes, and provide cracking strategies.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        let result: Record<string, unknown>;
        try {
          const rawRes4 = response.choices[0]?.message?.content;
          const resStr4 = typeof rawRes4 === 'string' ? rawRes4 : JSON.stringify(rawRes4) || "{}";
          result = JSON.parse(resStr4);
        } catch {
          const rawFallback4 = response.choices[0]?.message?.content;
          result = { notes: typeof rawFallback4 === 'string' ? rawFallback4 : '' };
        }

        const db = await getDb();
        if (db) {
          await db.insert(threatLogs).values({
            type: "hash_crack",
            target: input.hash,
            result: JSON.stringify(result),
            riskLevel: "safe",
          });
        }

        return result;
      }),

    generateDorks: publicProcedure
      .input(z.object({ target: z.string(), objective: z.string() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "claude-sonnet-4-5",
          messages: [
            {
              role: "system",
              content: `You are a Google Dorks expert for security research. Generate effective Google dork queries for OSINT and security research. Format as JSON: { "dorks": [{ "query": "", "description": "", "category": "" }], "notes": "" }`,
            },
            {
              role: "user",
              content: `Generate Google Dorks for target: ${input.target}\nObjective: ${input.objective}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        let result: Record<string, unknown>;
        try {
          const rawRes5 = response.choices[0]?.message?.content;
          const resStr5 = typeof rawRes5 === 'string' ? rawRes5 : JSON.stringify(rawRes5) || "{}";
          result = JSON.parse(resStr5);
        } catch {
          const rawFallback5 = response.choices[0]?.message?.content;
          result = { dorks: [], notes: typeof rawFallback5 === 'string' ? rawFallback5 : '' };
        }

        return result;
      }),
  }),

  // Ordo-ab-Chao Hub procedures
  hub: router({
    getGithubProjects: publicProcedure.query(async () => {
      try {
        const response = await fetch("https://api.github.com/users/Lucifer-AI-666/repos?per_page=30&sort=updated", {
          headers: { "Accept": "application/vnd.github.v3+json" },
        });
        if (!response.ok) return [];
        const repos = await response.json();
        return repos.map((r: Record<string, unknown>) => ({
          name: r.name,
          description: r.description,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          updatedAt: r.updated_at,
          url: r.html_url,
          openIssues: r.open_issues_count,
          isPrivate: r.private,
        }));
      } catch {
        return [];
      }
    }),

    getSystemStatus: publicProcedure.query(async () => {
      const db = await getDb();
      let dbStatus = false;
      try {
        if (db) {
          await db.select().from(threatLogs).limit(1);
          dbStatus = true;
        }
      } catch { /* ignore */ }

      return {
        database: dbStatus,
        api: true,
        timestamp: new Date().toISOString(),
        modules: {
          chat: true,
          sentinel: true,
          oraculum: true,
          hub: true,
        },
      };
    }),

        getRecentActivity: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(threatLogs)
          .orderBy(desc(threatLogs.createdAt))
          .limit(input.limit);
      }),
  }),

  // AI Agent procedures
  agent: router({
    planTask: publicProcedure
      .input(z.object({
        prompt: z.string(),
        directoryContext: z.string(),
        currentPath: z.string(),
        sessionToken: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are TAUROS AGENT, an autonomous AI agent that operates on the user's filesystem.
You receive a task description and the current directory listing, then produce a structured plan of filesystem operations.

Available actions:
- create_file: create a new file (provide name and content)
- create_directory: create a new folder (provide name)
- write_file: overwrite an existing file (provide name and content)
- read_file: read a file's content (provide name)
- delete: delete a file or folder (provide name)
- move: move/rename a file (provide name and destination)

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief description of what you will do",
  "steps": [
    {
      "action": "create_file",
      "name": "filename.txt",
      "content": "file content here",
      "description": "Human-readable description of this step"
    }
  ]
}

Be precise, safe, and efficient. Never delete important system files.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Current path: ${input.currentPath}\n\nDirectory contents:\n${input.directoryContext}\n\nTask: ${input.prompt}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "agent_plan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        name: { type: "string" },
                        content: { type: "string" },
                        destination: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["action", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "steps"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
        const plan = JSON.parse(contentStr) as {
          summary: string;
          steps: Array<{
            action: string;
            name?: string;
            content?: string;
            destination?: string;
            description: string;
          }>;
        };
        return plan;
      }),
  }),
  deps: router({
    scan: publicProcedure.query(async () => {
      try {
        const { execSync } = await import("child_process");
        const pkgRaw = await import("../package.json", { assert: { type: "json" } });
        const pkg = pkgRaw.default as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        const allDeps: Array<{ name: string; current: string; type: "dep" | "devDep" }> = [
          ...Object.entries(pkg.dependencies || {}).map(([name, ver]) => ({ name, current: ver.replace(/^[^\d]*/, ""), type: "dep" as const })),
          ...Object.entries(pkg.devDependencies || {}).map(([name, ver]) => ({ name, current: ver.replace(/^[^\d]*/, ""), type: "devDep" as const })),
        ];
        // Check outdated via npm
        let outdatedMap: Record<string, { latest: string }> = {};
        try {
          const out = execSync("npm outdated --json 2>/dev/null || true", { cwd: process.cwd(), timeout: 30000 }).toString();
          if (out.trim()) outdatedMap = JSON.parse(out);
        } catch { /* ignore */ }
        const deps = allDeps.map(d => ({
          ...d,
          latest: outdatedMap[d.name]?.latest || d.current,
          outdated: !!outdatedMap[d.name],
        }));
        return {
          scannedAt: new Date().toISOString(),
          total: deps.length,
          outdated: deps.filter(d => d.outdated).length,
          deps,
        };
      } catch (err: unknown) {
        throw new Error(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
    update: publicProcedure
      .input(z.object({ packages: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        try {
          const { execSync } = await import("child_process");
          const pkgList = input.packages.join(" ");
          execSync(`pnpm add ${pkgList} 2>&1`, { cwd: process.cwd(), timeout: 120000 });
          return { success: true, updated: input.packages };
        } catch (err: unknown) {
          throw new Error(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
