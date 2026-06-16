import { createHash, randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "./db";
import { vipSessions } from "../drizzle/schema";

// VIP code verification using a proprietary cryptographic algorithm
// The algorithm: SHA-256 of (salt + code + reversed_code + magic_constant)
const MAGIC_CONSTANT = "DIBORACULUM_TAUROS_SENTINEL_X7K9";
const SALT = "dib_vip_2026_";
const SESSION_DURATION_HOURS = 24;

// The master VIP code hash (SHA-256 of the algorithm applied to "TAUROS666")
// This is the default VIP access code — change via env var VIP_CODE_HASH
function getVipCodeHash(): string {
  return process.env.VIP_CODE_HASH || computeCodeHash("TAUROS666");
}

export function computeCodeHash(code: string): string {
  const upper = code.toUpperCase().trim();
  const reversed = upper.split("").reverse().join("");
  const payload = `${SALT}${upper}${reversed}${MAGIC_CONSTANT}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function verifyVipCode(code: string): boolean {
  const inputHash = computeCodeHash(code);
  const validHash = getVipCodeHash();
  // Constant-time comparison to prevent timing attacks
  if (inputHash.length !== validHash.length) return false;
  let diff = 0;
  for (let i = 0; i < inputHash.length; i++) {
    diff |= inputHash.charCodeAt(i) ^ validHash.charCodeAt(i);
  }
  return diff === 0;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createVipSession(ipAddress?: string, userAgent?: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await db.insert(vipSessions).values({
    sessionToken: token,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    isActive: true,
    expiresAt,
  });

  return token;
}

export async function validateVipSession(token: string): Promise<boolean> {
  if (!token) return false;
  const db = await getDb();
  if (!db) return false;

  const now = new Date();
  const result = await db
    .select()
    .from(vipSessions)
    .where(
      and(
        eq(vipSessions.sessionToken, token),
        eq(vipSessions.isActive, true),
        gt(vipSessions.expiresAt, now)
      )
    )
    .limit(1);

  return result.length > 0;
}

export async function revokeVipSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(vipSessions)
    .set({ isActive: false })
    .where(eq(vipSessions.sessionToken, token));
}
