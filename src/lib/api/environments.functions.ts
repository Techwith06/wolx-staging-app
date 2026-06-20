import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { environments } from "../db/schema";
import { getUserFromToken } from "../auth.server";

export const listEnvironments = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const result = await db
      .select()
      .from(environments)
      .where(eq(environments.userId, session.id))
      .orderBy(desc(environments.createdAt));

    return result as unknown as Array<{
      id: string; userId: string; name: string; baseUrl: string;
      type: string; authType: string; apiKeyId: string | null;
      status: string; variables: string[]; globalHeaders: string[];
      createdAt: Date;
    }>;
  });

export const createEnvironment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      name: z.string().min(1, "Name is required"),
      baseUrl: z.string().url("Invalid URL"),
      type: z.enum(["local", "development", "staging", "production", "external"]),
      authType: z.enum(["api_key", "bearer_token", "none"]),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const [env] = await db
      .insert(environments)
      .values({
        userId: session.id,
        name: data.name,
        baseUrl: data.baseUrl,
        type: data.type,
        authType: data.authType,
      })
      .returning();

    return env as unknown as {
      id: string; name: string; createdAt: Date; userId: string;
      status: string; baseUrl: string; type: string; authType: string;
      apiKeyId: string | null; variables: string[]; globalHeaders: string[];
    };
  });

export const updateEnvironment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      envId: z.string().uuid(),
      name: z.string().min(1).optional(),
      baseUrl: z.string().url().optional(),
      status: z.enum(["active", "locked"]).optional(),
      variables: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
      globalHeaders: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const updates: Record<string, unknown> = {};
    if (data.name) updates.name = data.name;
    if (data.baseUrl) updates.baseUrl = data.baseUrl;
    if (data.status) updates.status = data.status;
    if (data.variables) updates.variables = data.variables as unknown as string[];
    if (data.globalHeaders) updates.globalHeaders = data.globalHeaders as unknown as string[];

    await db
      .update(environments)
      .set(updates)
      .where(eq(environments.id, data.envId));

    return { success: true };
  });

export const deleteEnvironment = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string(), envId: z.string().uuid() })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    await db.delete(environments).where(eq(environments.id, data.envId));
    return { success: true };
  });

export const testEnvironmentConnection = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string(), envId: z.string().uuid() })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();
    const [env] = await db
      .select()
      .from(environments)
      .where(eq(environments.id, data.envId));

    if (!env) throw new Error("Environment not found");

    try {
      const url = env.baseUrl.replace(/\/+$/, "") + "/health";
      const start = Date.now();
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const ms = Date.now() - start;
      return { status: response.status, ok: response.ok, ms };
    } catch (error) {
      return { status: 0, ok: false, ms: 0, error: String(error) };
    }
  });
