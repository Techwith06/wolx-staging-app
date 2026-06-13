import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, desc, gte } from "drizzle-orm";
import { createHmac, randomBytes } from "node:crypto";

import { getDb } from "../db/index.server";
import { webhookLogs } from "../db/schema";
import { getUserFromToken } from "../auth.server";

const EVENT_TEMPLATES: Record<string, Record<string, unknown>> = {
  "payment.success": {
    event: "payment.success",
    data: { reference: "PAY_12345", amount: 10, currency: "GHS", status: "success" },
  },
  "payment.failed": {
    event: "payment.failed",
    data: { reference: "PAY_12345", amount: 10, currency: "GHS", status: "failed", reason: "insufficient_funds" },
  },
  "video.completed": {
    event: "video.completed",
    data: { video_id: "vid_abc123", duration: 245, status: "completed", output_url: "https://cdn.example.com/output.mp4" },
  },
  "video.failed": {
    event: "video.failed",
    data: { video_id: "vid_abc123", duration: 45, status: "failed", error: "transcoding_timeout" },
  },
  "wallet.funded": {
    event: "wallet.funded",
    data: { wallet_id: "wlt_001", amount: 500, currency: "GHS", balance: 2500 },
  },
  "custom": {
    event: "custom.event",
    data: { message: "Hello world" },
  },
};

function generateSignature(payload: unknown, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest("hex")}`;
}

export const getEventTemplates = createServerFn({ method: "POST" })
  .inputValidator(z.object({ eventType: z.string() }))
  .handler(async ({ data }) => {
    const tmpl = EVENT_TEMPLATES[data.eventType];
    if (!tmpl) return null;
    return tmpl as Record<string, unknown>;
  });

export const sendTestWebhook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      targetUrl: z.string().url(),
      eventType: z.string(),
      payload: z.any(),
      delay: z.number().min(0).max(30000).default(0),
      secret: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const signature = data.secret ? generateSignature(data.payload, data.secret) : "";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (signature) headers["X-Wolx-Signature"] = signature;

    if (data.delay > 0) {
      await new Promise((r) => setTimeout(r, data.delay));
    }

    const start = performance.now();
    let statusCode = 0;
    let responseBody = "";
    let errorMsg = "";

    try {
      const res = await fetch(data.targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(data.payload),
      });
      statusCode = res.status;
      responseBody = await res.text();
    } catch (err) {
      statusCode = 0;
      errorMsg = err instanceof Error ? err.message : "Connection failed";
      responseBody = JSON.stringify({ error: errorMsg });
    }
    const deliveryTime = Math.round(performance.now() - start);

    const db = getDb();
    const [log] = await db
      .insert(webhookLogs)
      .values({
        userId: session.id,
        eventType: data.eventType,
        source: "simulator",
        targetUrl: data.targetUrl,
        payload: data.payload as Record<string, unknown>,
        statusCode,
        responseBody,
        deliveryTime,
        signature: signature || null,
        delay: data.delay,
        status: statusCode >= 200 && statusCode < 300 ? "delivered" : "failed",
      })
      .returning();

    return log as unknown as {
      id: string; eventType: string; targetUrl: string; statusCode: number;
      responseBody: string; deliveryTime: number; signature: string | null;
      status: string; createdAt: Date;
    };
  });

export const listWebhookLogs = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      filter: z.enum(["all", "delivered", "failed", "pending"]).optional().default("all"),
      limit: z.number().max(100).optional().default(50),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const conditions = [eq(webhookLogs.userId, session.id)];
    if (data.filter !== "all") conditions.push(eq(webhookLogs.status, data.filter));

    const result = await db
      .select()
      .from(webhookLogs)
      .where(and(...conditions))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(data.limit);

    return result as unknown as Array<{
      id: string; eventType: string; targetUrl: string; payload: Record<string, unknown>;
      statusCode: number; responseBody: string | null; deliveryTime: number;
      signature: string | null; delay: number; status: string; createdAt: Date;
    }>;
  });

export const replayWebhook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      logId: z.string().uuid(),
      delay: z.number().min(0).max(30000).optional().default(0),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const [original] = await db
      .select()
      .from(webhookLogs)
      .where(and(eq(webhookLogs.id, data.logId), eq(webhookLogs.userId, session.id)))
      .limit(1);

    if (!original) throw new Error("Webhook log not found");

    const secret = original.signature
      ? original.signature.replace("sha256=", "")
      : undefined;

    return sendTestWebhook({
      data: {
        token: data.token,
        targetUrl: original.targetUrl,
        eventType: original.eventType,
        payload: original.payload,
        delay: data.delay,
        secret,
      },
    });
  });

export const getWebhookHealth = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalResult, recentResult, lastSuccess, lastFailure] = await Promise.all([
      db.select().from(webhookLogs).where(eq(webhookLogs.userId, session.id)),
      db.select().from(webhookLogs).where(
        and(eq(webhookLogs.userId, session.id), gte(webhookLogs.createdAt, oneDayAgo))
      ),
      db.select().from(webhookLogs).where(
        and(eq(webhookLogs.userId, session.id), eq(webhookLogs.status, "delivered"))
      ).orderBy(desc(webhookLogs.createdAt)).limit(1),
      db.select().from(webhookLogs).where(
        and(eq(webhookLogs.userId, session.id), eq(webhookLogs.status, "failed"))
      ).orderBy(desc(webhookLogs.createdAt)).limit(1),
    ]);

    const total = totalResult.length;
    const recent = recentResult.length;
    const failed24h = recentResult.filter((l) => l.status === "failed").length;
    const success24h = recent - failed24h;
    const health = total === 0 ? "inactive" : failed24h > success24h ? "degraded" : "active";

    return {
      status: health as "active" | "degraded" | "inactive",
      totalDelivered: totalResult.filter((l) => l.status === "delivered").length,
      totalFailed: totalResult.filter((l) => l.status === "failed").length,
      lastSuccessAt: lastSuccess[0]?.createdAt ?? null,
      lastFailureAt: lastFailure[0]?.createdAt ?? null,
      recentSuccess24h: success24h,
      recentFailed24h: failed24h,
    } as {
      status: "active" | "degraded" | "inactive";
      totalDelivered: number; totalFailed: number;
      lastSuccessAt: Date | null; lastFailureAt: Date | null;
      recentSuccess24h: number; recentFailed24h: number;
    };
  });
