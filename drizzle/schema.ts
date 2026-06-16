import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// VIP sessions table
export const vipSessions = mysqlTable("vip_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull().unique(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type VipSession = typeof vipSessions.$inferSelect;

// Chat history table
export const chatHistory = mysqlTable("chat_history", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull(),
  model: varchar("model", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatHistory.$inferSelect;

// Threat logs table
export const threatLogs = mysqlTable("threat_logs", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["url_scan", "apk_analysis", "osint", "hash_crack"]).notNull(),
  target: text("target").notNull(),
  result: text("result"),
  riskLevel: mysqlEnum("riskLevel", ["safe", "low", "medium", "high", "critical"]).default("safe"),
  sessionToken: varchar("sessionToken", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ThreatLog = typeof threatLogs.$inferSelect;
