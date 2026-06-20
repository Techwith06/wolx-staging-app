import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { userSettings, requestLogs, webhookLogs } from "../db/schema";
import { getUserFromToken } from "../auth.server";

export const getSettings = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();

    let [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.id));

    if (!settings) {
      [settings] = await db
        .insert(userSettings)
        .values({ userId: session.id })
        .returning();
    }

    return {
      appName: settings.appName,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      theme: settings.theme,
      sidebarExpanded: settings.sidebarExpanded,
      showIcons: settings.showIcons,
      defaultTimeout: settings.defaultTimeout,
      autoSaveRequests: settings.autoSaveRequests,
      followRedirects: settings.followRedirects,
      notifyRequestFailed: settings.notifyRequestFailed,
      notifyWebhookFailure: settings.notifyWebhookFailure,
      notifyEnvOffline: settings.notifyEnvOffline,
      notifyKeyExpired: settings.notifyKeyExpired,
      sessionTimeout: settings.sessionTimeout,
      requireReauth: settings.requireReauth,
      twoFactorAuth: settings.twoFactorAuth,
      enableLocalhost: settings.enableLocalhost,
      allowedPorts: settings.allowedPorts,
      allowSelfSignedSsl: settings.allowSelfSignedSsl,
      allowPrivateIPs: settings.allowPrivateIPs,
    };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      appName: z.string().optional(),
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      theme: z.string().optional(),
      sidebarExpanded: z.boolean().optional(),
      showIcons: z.boolean().optional(),
      defaultTimeout: z.number().optional(),
      autoSaveRequests: z.boolean().optional(),
      followRedirects: z.boolean().optional(),
      notifyRequestFailed: z.boolean().optional(),
      notifyWebhookFailure: z.boolean().optional(),
      notifyEnvOffline: z.boolean().optional(),
      notifyKeyExpired: z.boolean().optional(),
      sessionTimeout: z.number().optional(),
      requireReauth: z.boolean().optional(),
      twoFactorAuth: z.boolean().optional(),
      enableLocalhost: z.boolean().optional(),
      allowedPorts: z.string().optional(),
      allowSelfSignedSsl: z.boolean().optional(),
      allowPrivateIPs: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();

    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.id));

    const updates: Record<string, unknown> = {};
    const fields = [
      "appName", "timezone", "dateFormat", "theme",
      "sidebarExpanded", "showIcons",
      "defaultTimeout", "autoSaveRequests", "followRedirects",
      "notifyRequestFailed", "notifyWebhookFailure", "notifyEnvOffline", "notifyKeyExpired",
      "sessionTimeout", "requireReauth", "twoFactorAuth",
      "enableLocalhost", "allowedPorts", "allowSelfSignedSsl", "allowPrivateIPs",
    ] as const;

    for (const key of fields) {
      if (data[key as keyof typeof data] !== undefined) {
        updates[key] = data[key as keyof typeof data];
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();

      if (existing.length > 0) {
        await db
          .update(userSettings)
          .set(updates)
          .where(eq(userSettings.userId, session.id));
      } else {
        await db
          .insert(userSettings)
          .values({ userId: session.id, ...updates } as Record<string, unknown>)
          .returning();
      }
    }

    return { success: true };
  });

export const deleteAllLogs = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();

    await Promise.all([
      db.delete(requestLogs).where(eq(requestLogs.userId, session.id)),
      db.delete(webhookLogs).where(eq(webhookLogs.userId, session.id)),
    ]);

    return { success: true };
  });
