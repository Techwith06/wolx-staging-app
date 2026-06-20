import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, desc, gte, sql } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { apiKeys, environments, requestLogs, webhookLogs } from "../db/schema";
import { getUserFromToken } from "../auth.server";

export const getOverviewData = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [keys, envs] = await Promise.all([
      db.select().from(apiKeys).where(eq(apiKeys.userId, session.id)),
      db.select().from(environments).where(eq(environments.userId, session.id)),
    ]);

    const totalKeys = keys.length;
    const activeKeys = keys.filter((k) => k.status === "active").length;
    const expiredKeys = keys.filter((k) => k.status === "expired" || k.status === "disabled").length;
    const mostUsedKeys = keys.slice(0, 3).map((k) => ({
      name: k.name,
      prefix: k.keyPrefix,
      environment: k.environment,
    }));

    const totalEnvs = envs.length;
    const envStatuses = envs.map((e) => ({
      id: e.id,
      name: e.name,
      baseUrl: e.baseUrl,
      type: e.type,
      status: e.status,
    }));

    const [requestLogsAll, todayLogs, webhookLogsAll, todayWebhooks] = await Promise.all([
      db.select().from(requestLogs).where(eq(requestLogs.userId, session.id)),
      db.select().from(requestLogs).where(
        and(eq(requestLogs.userId, session.id), gte(requestLogs.createdAt, todayStart))
      ),
      db.select().from(webhookLogs).where(eq(webhookLogs.userId, session.id)),
      db.select().from(webhookLogs).where(
        and(eq(webhookLogs.userId, session.id), gte(webhookLogs.createdAt, todayStart))
      ),
    ]);

    const requestsToday = todayLogs.length;
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayLogs = requestLogsAll.filter(
      (l) => l.createdAt >= yesterdayStart && l.createdAt < todayStart
    );
    const requestsYesterday = yesterdayLogs.length;
    const requestChange = requestsYesterday > 0
      ? Math.round(((requestsToday - requestsYesterday) / requestsYesterday) * 100)
      : 0;

    const successfulToday = todayLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length;
    const failedToday = todayLogs.filter((l) => l.statusCode >= 400).length;

    const totalRequests = requestLogsAll.length;
    const totalSuccessful = requestLogsAll.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length;
    const totalFailed = totalRequests - totalSuccessful;
    const avgResponseTime = totalRequests > 0
      ? Math.round(requestLogsAll.reduce((a, l) => a + l.responseTime, 0) / totalRequests)
      : 0;
    const slowestRequest = totalRequests > 0
      ? Math.max(...requestLogsAll.map((l) => l.responseTime))
      : 0;

    const webhooksSent = webhookLogsAll.length;
    const webhooksDelivered = webhookLogsAll.filter((l) => l.status === "delivered").length;
    const webhooksFailed = webhookLogsAll.filter((l) => l.status === "failed").length;
    const webhookSuccessRate = webhooksSent > 0
      ? Math.round((webhooksDelivered / webhooksSent) * 1000) / 10
      : 0;

    const webhooksToday = todayWebhooks.length;

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days: {
      label: string; requests: number; successes: number; failures: number;
      avgResponseTime: number; webhooks: number; webhookDelivered: number; webhookFailed: number;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayLogs = requestLogsAll.filter((l) => l.createdAt >= dayStart && l.createdAt < dayEnd);
      const dayWebhooks = webhookLogsAll.filter((l) => l.createdAt >= dayStart && l.createdAt < dayEnd);
      const dayTimes = dayLogs.map((l) => l.responseTime);
      days.push({
        label: dayLabels[d.getDay()],
        requests: dayLogs.length,
        successes: dayLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
        failures: dayLogs.filter((l) => l.statusCode >= 400).length,
        avgResponseTime: dayTimes.length > 0 ? Math.round(dayTimes.reduce((a, b) => a + b, 0) / dayTimes.length) : 0,
        webhooks: dayWebhooks.length,
        webhookDelivered: dayWebhooks.filter((l) => l.status === "delivered").length,
        webhookFailed: dayWebhooks.filter((l) => l.status === "failed").length,
      });
    }

    const envTypeDistribution: Record<string, number> = {};
    for (const e of envs) {
      envTypeDistribution[e.type] = (envTypeDistribution[e.type] || 0) + 1;
    }

    const keyStatusDistribution: Record<string, number> = {};
    for (const k of keys) {
      keyStatusDistribution[k.status] = (keyStatusDistribution[k.status] || 0) + 1;
    }

    const recentActivity = [
      ...todayLogs.map((l) => ({
        time: l.createdAt,
        type: "request" as const,
        method: l.method,
        endpoint: l.endpoint,
        statusCode: l.statusCode,
      })),
      ...todayWebhooks.map((l) => ({
        time: l.createdAt,
        type: "webhook" as const,
        eventType: l.eventType,
        status: l.status,
        statusCode: l.statusCode,
      })),
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 10);

    const recentErrors = [
      ...requestLogsAll
        .filter((l) => l.statusCode >= 400)
        .slice(0, 5)
        .map((l) => ({
          time: l.createdAt,
          type: "request" as const,
          method: l.method,
          endpoint: l.endpoint,
          statusCode: l.statusCode,
        })),
      ...webhookLogsAll
        .filter((l) => l.status === "failed")
        .slice(0, 5)
        .map((l) => ({
          time: l.createdAt,
          type: "webhook" as const,
          targetUrl: l.targetUrl,
          statusCode: l.statusCode,
        })),
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 5);

    const isNewUser = totalKeys === 0 && totalEnvs === 0 && totalRequests === 0;

    return {
      stats: {
        totalKeys,
        activeKeys,
        expiredKeys,
        totalEnvs,
        envStatuses,
        requestsToday,
        requestChange,
        successfulToday,
        failedToday,
        webhooksToday,
        webhooksSent,
        webhooksDelivered,
        webhooksFailed,
        webhookSuccessRate,
        totalRequests,
        totalSuccessful,
        totalFailed,
        avgResponseTime,
        slowestRequest,
        mostUsedKeys,
      },
      activityChart: days,
      envTypeDistribution,
      keyStatusDistribution,
      recentActivity,
      recentErrors,
      isNewUser,
    } as {
      stats: {
        totalKeys: number; activeKeys: number; expiredKeys: number;
        totalEnvs: number;
        envStatuses: { id: string; name: string; baseUrl: string; type: string; status: string }[];
        requestsToday: number; requestChange: number;
        successfulToday: number; failedToday: number;
        webhooksToday: number;
        webhooksSent: number; webhooksDelivered: number; webhooksFailed: number;
        webhookSuccessRate: number;
        totalRequests: number; totalSuccessful: number; totalFailed: number;
        avgResponseTime: number; slowestRequest: number;
        mostUsedKeys: { name: string; prefix: string; environment: string }[];
      };
      activityChart: {
        label: string; requests: number; successes: number; failures: number;
        avgResponseTime: number; webhooks: number; webhookDelivered: number; webhookFailed: number;
      }[];
      envTypeDistribution: Record<string, number>;
      keyStatusDistribution: Record<string, number>;
      recentActivity: (
        | { time: Date; type: "request"; method: string; endpoint: string; statusCode: number }
        | { time: Date; type: "webhook"; eventType: string; status: string; statusCode: number | null }
      )[];
      recentErrors: (
        | { time: Date; type: "request"; method: string; endpoint: string; statusCode: number }
        | { time: Date; type: "webhook"; targetUrl: string; statusCode: number | null }
      )[];
      isNewUser: boolean;
    };
  });
