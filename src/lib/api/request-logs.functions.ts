import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, desc, gte, sql } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { requestLogs } from "../db/schema";
import { getUserFromToken } from "../auth.server";

export const logRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      method: z.string(),
      endpoint: z.string(),
      statusCode: z.number(),
      responseTime: z.number(),
      requestBody: z.string().optional(),
      responseBody: z.string().optional(),
      requestHeaders: z.record(z.string()).optional(),
      responseHeaders: z.record(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) return null;

    const db = getDb();
    const [log] = await db
      .insert(requestLogs)
      .values({
        userId: session.id,
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        requestBody: data.requestBody || null,
        responseBody: data.responseBody || null,
        requestHeaders: data.requestHeaders as unknown as string[] || null,
        responseHeaders: data.responseHeaders as unknown as string[] || null,
      })
      .returning();

    return log;
  });

export const listRequestLogs = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      filter: z.enum(["all", "2xx", "4xx", "5xx", "slow"]).optional().default("all"),
      search: z.string().optional(),
      limit: z.number().max(100).optional().default(50),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    let query = db
      .select()
      .from(requestLogs)
      .where(eq(requestLogs.userId, session.id));

    if (data.filter === "2xx") {
      query = db
        .select()
        .from(requestLogs)
        .where(
          and(eq(requestLogs.userId, session.id), sql`${requestLogs.statusCode} >= 200 AND ${requestLogs.statusCode} < 300`)
        );
    } else if (data.filter === "4xx") {
      query = db
        .select()
        .from(requestLogs)
        .where(
          and(eq(requestLogs.userId, session.id), sql`${requestLogs.statusCode} >= 400 AND ${requestLogs.statusCode} < 500`)
        );
    } else if (data.filter === "5xx") {
      query = db
        .select()
        .from(requestLogs)
        .where(
          and(eq(requestLogs.userId, session.id), sql`${requestLogs.statusCode} >= 500`)
        );
    } else if (data.filter === "slow") {
      query = db
        .select()
        .from(requestLogs)
        .where(
          and(eq(requestLogs.userId, session.id), sql`${requestLogs.responseTime} > 2000`)
        );
    }

    const result = await query
      .orderBy(desc(requestLogs.createdAt))
      .limit(data.limit);

    return result as unknown as Array<{
      id: string; userId: string; method: string; endpoint: string;
      statusCode: number; responseTime: number;
      requestBody: string | null; responseBody: string | null;
      requestHeaders: string[] | null; responseHeaders: string[] | null;
      createdAt: Date;
    }>;
  });

export const getRequestLogStats = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await db
      .select()
      .from(requestLogs)
      .where(
        and(eq(requestLogs.userId, session.id), gte(requestLogs.createdAt, thirtyDaysAgo))
      );

    const total = logs.length;
    if (total === 0) {
      return {
        totalRequests: 0, avgResponseTime: 0,
        fastestRequest: 0, slowestRequest: 0, errorRate: 0,
      };
    }

    const errors = logs.filter((l) => l.statusCode >= 400).length;
    const times = logs.map((l) => l.responseTime);

    return {
      totalRequests: total,
      avgResponseTime: Math.round(times.reduce((a, b) => a + b, 0) / total),
      fastestRequest: Math.min(...times),
      slowestRequest: Math.max(...times),
      errorRate: Math.round((errors / total) * 100 * 10) / 10,
    };
  });

export const deleteRequestLogs = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      retention: z.enum(["1day", "7days", "30days"]).optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    if (data.retention) {
      const cutoff = new Date();
      if (data.retention === "1day") cutoff.setDate(cutoff.getDate() - 1);
      else if (data.retention === "7days") cutoff.setDate(cutoff.getDate() - 7);
      else if (data.retention === "30days") cutoff.setDate(cutoff.getDate() - 30);
      await db
        .delete(requestLogs)
        .where(
          and(
            eq(requestLogs.userId, session.id),
            sql`${requestLogs.createdAt} < ${cutoff}`
          )
        );
    } else {
      await db.delete(requestLogs).where(eq(requestLogs.userId, session.id));
    }

    return { success: true };
  });
