import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("vip.login", () => {
  it("returns error for invalid code", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.vip.login({ code: "INVALID_CODE_12345" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("vip.verify", () => {
  it("returns not authenticated without session cookie", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.vip.verify();
    expect(result.authenticated).toBe(false);
  });
});

describe("hub.getSystemStatus", () => {
  it("returns system status object with expected shape", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.hub.getSystemStatus();
    expect(result).toHaveProperty("api");
    expect(result).toHaveProperty("modules");
    expect(typeof result.api).toBe("boolean");
  });
});

describe("deps.scan", () => {
  it("returns scan result with total and deps array", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.deps.scan();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("outdated");
    expect(result).toHaveProperty("deps");
    expect(Array.isArray(result.deps)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  }, 60000); // npm outdated can be slow
});
