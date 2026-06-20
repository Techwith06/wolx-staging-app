import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { eq, and, desc, gte } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { apiKeys, webhooks, apiLogs } from "../db/schema";
import { getUserFromToken } from "../auth.server";

const PERMISSIONS = [
  "video:create",
  "video:read",
  "webhook:receive",
  "analytics:read",
  "payments:read",
] as const;

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateApiKey(environment: string) {
  const prefix = environment === "production" ? "wolx_live_" : "wolx_test_";
  const random = crypto.randomBytes(24).toString("hex");
  return { fullKey: prefix + random, prefix, raw: random };
}

export const createApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      name: z.string().min(1, "Name is required"),
      environment: z.enum(["production", "sandbox"]),
      permissions: z.array(z.string()).min(1, "Select at least one permission"),
      expiration: z.enum(["never", "30days", "custom"]),
      customExpiry: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const { fullKey, prefix } = generateApiKey(data.environment);
    const keyHash = hashKey(fullKey);

    let expiresAt: Date | null = null;
    if (data.expiration === "30days") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (data.expiration === "custom" && data.customExpiry) {
      expiresAt = new Date(data.customExpiry);
    }

    const db = getDb();
    await db.insert(apiKeys).values({
      userId: session.id,
      keyHash,
      keyPrefix: prefix,
      name: data.name,
      environment: data.environment,
      permissions: data.permissions as unknown as string[],
      status: "active",
      expiresAt,
    });

    return { key: fullKey, prefix };
  });

export const listApiKeys = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const keys = await db
      .select({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        name: apiKeys.name,
        environment: apiKeys.environment,
        permissions: apiKeys.permissions,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, session.id))
      .orderBy(desc(apiKeys.createdAt));

    return keys as unknown as Array<{
      id: string; keyPrefix: string; name: string; environment: string;
      permissions: string[]; status: string; lastUsedAt: Date | null;
      expiresAt: Date | null; createdAt: Date;
    }>;
  });

export const updateApiKeyStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      keyId: z.string().uuid(),
      status: z.enum(["active", "disabled"]),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    await db
      .update(apiKeys)
      .set({ status: data.status })
      .where(and(eq(apiKeys.id, data.keyId), eq(apiKeys.userId, session.id)));

    return { success: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string(), keyId: z.string().uuid() })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, data.keyId), eq(apiKeys.userId, session.id)));

    return { success: true };
  });

export const regenerateApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string(), keyId: z.string().uuid() })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const [existing] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, data.keyId), eq(apiKeys.userId, session.id)));

    if (!existing) throw new Error("API key not found");

    const { fullKey, prefix } = generateApiKey(existing.environment);
    const keyHash = hashKey(fullKey);

    await db
      .update(apiKeys)
      .set({ keyHash, keyPrefix: prefix })
      .where(eq(apiKeys.id, data.keyId));

    return { key: fullKey, prefix };
  });

export const getWebhookSettings = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const [settings] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.userId, session.id));

    return settings || null;
  });

export const upsertWebhookSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      baseUrl: z.string().url("Invalid Base URL"),
      webhookUrl: z.string().url("Invalid Webhook URL"),
      callbackUrl: z.string().url("Invalid Callback URL").optional().or(z.literal("")),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const secretToken = crypto.randomBytes(32).toString("hex");
    const db = getDb();

    const [existing] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.userId, session.id));

    if (existing) {
      await db
        .update(webhooks)
        .set({
          baseUrl: data.baseUrl,
          webhookUrl: data.webhookUrl,
          callbackUrl: data.callbackUrl || null,
          secretToken: existing.secretToken,
        })
        .where(eq(webhooks.userId, session.id));

      return { secretToken: existing.secretToken };
    }

    await db.insert(webhooks).values({
      userId: session.id,
      baseUrl: data.baseUrl,
      webhookUrl: data.webhookUrl,
      callbackUrl: data.callbackUrl || null,
      secretToken,
    });

    return { secretToken };
  });

export const getApiLogs = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string(), limit: z.number().max(100).optional().default(50) })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const logs = await db
      .select()
      .from(apiLogs)
      .where(eq(apiLogs.userId, session.id))
      .orderBy(desc(apiLogs.createdAt))
      .limit(data.limit);

    return logs;
  });

export const getApiUsageStats = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await db
      .select()
      .from(apiLogs)
      .where(
        and(
          eq(apiLogs.userId, session.id),
          // @ts-ignore - Drizzle timestamp comparison
          gte(apiLogs.createdAt, thirtyDaysAgo)
        )
      );

    const total = logs.length;
    const failed = logs.filter((l) => l.statusCode >= 400).length;
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 100;
    const avgResponseTime =
      total > 0
        ? Math.round(logs.reduce((sum, l) => sum + l.responseTime, 0) / total)
        : 0;

    return {
      totalRequests: total,
      successRate: Math.round(successRate * 10) / 10,
      failedRequests: failed,
      avgResponseTime,
    };
  });


