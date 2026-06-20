import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { savedApis } from "../db/schema";
import { getUserFromToken } from "../auth.server";

const endpointSchema = z.object({
  method: z.string(),
  path: z.string(),
  description: z.string(),
  requestBody: z.string().optional(),
  responseBody: z.string(),
});

export const saveGeneratedApi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      name: z.string(),
      description: z.string().optional(),
      version: z.string().optional(),
      framework: z.string().optional(),
      database: z.string().optional(),
      auth: z.string().optional(),
      endpoints: z.array(endpointSchema),
      schemas: z.array(z.string()).optional(),
      codeSamples: z.record(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();

    const [saved] = await db
      .insert(savedApis)
      .values({
        userId: session.id,
        name: data.name,
        description: data.description ?? "",
        version: data.version ?? "v1",
        framework: data.framework ?? null,
        database: data.database ?? null,
        auth: data.auth ?? null,
        endpoints: data.endpoints as any,
        schemas: data.schemas ?? [],
        codeSamples: data.codeSamples as any,
      })
      .returning();

    return saved as any;
  });

export const listSavedApis = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();

    const apis = await db
      .select()
      .from(savedApis)
      .where(eq(savedApis.userId, session.id))
      .orderBy(desc(savedApis.createdAt));

    return apis as any;
  });

export const deleteSavedApi = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    const session = await getUserFromToken(data.token);
    if (!session) throw new Error("Unauthorized");

    const db = getDb();

    await db
      .delete(savedApis)
      .where(eq(savedApis.id, data.id));

    return { success: true };
  });
