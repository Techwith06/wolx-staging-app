import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, desc, and, gte } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { users, sessions, apiKeys, environments, requestLogs, webhookLogs } from "../db/schema";
import { getUserFromToken } from "../auth.server";

export const getProfileData = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.id));

    if (!user) throw new Error("User not found");

    const [keyCount, envCount, reqCount, webhookCount, userSessions] = await Promise.all([
      db.select({ count: eq(apiKeys.id, apiKeys.id) }).from(apiKeys).where(eq(apiKeys.userId, session.id)).then((r) => r.length),
      db.select({ count: eq(environments.id, environments.id) }).from(environments).where(eq(environments.userId, session.id)).then((r) => r.length),
      db.select({ count: eq(requestLogs.id, requestLogs.id) }).from(requestLogs).where(eq(requestLogs.userId, session.id)).then((r) => r.length),
      db.select({ count: eq(webhookLogs.id, webhookLogs.id) }).from(webhookLogs).where(eq(webhookLogs.userId, session.id)).then((r) => r.length),
      db.select().from(sessions).where(and(eq(sessions.userId, session.id), gte(sessions.expiresAt, new Date()))).orderBy(desc(sessions.createdAt)),
    ]);

    const [lastRequest] = await db
      .select()
      .from(requestLogs)
      .where(eq(requestLogs.userId, session.id))
      .orderBy(desc(requestLogs.createdAt))
      .limit(1);

    const [lastWebhook] = await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.userId, session.id))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(1);

    const lastLogin = userSessions.length > 0
      ? userSessions[0].createdAt
      : user.createdAt;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      stats: {
        apiKeys: keyCount,
        environments: envCount,
        requestsSent: reqCount,
        webhookTests: webhookCount,
      },
      activity: {
        lastLogin,
        lastRequestAt: lastRequest?.createdAt ?? null,
        lastWebhookAt: lastWebhook?.createdAt ?? null,
        lastRequestEndpoint: lastRequest?.endpoint ?? null,
        lastWebhookEvent: lastWebhook?.eventType ?? null,
      },
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const updates: Record<string, string> = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, session.id));
    }

    return { success: true };
  });
