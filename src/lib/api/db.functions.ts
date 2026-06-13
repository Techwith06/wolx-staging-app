import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { getDb } from "../db/index.server";
import { users, sessions } from "../db/schema";
import { createSession, getUserFromToken, hashPassword, verifyPassword } from "../auth.server";

export const signupUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    })
  )
  .handler(async ({ data }) => {
    const db = getDb();

    const existing = await db.select().from(users).where(eq(users.email, data.email));
    if (existing.length > 0) {
      throw new Error("An account with this email already exists");
    }

    const passwordHash = await hashPassword(data.password);
    const [user] = await db
      .insert(users)
      .values({ name: data.name, email: data.email, passwordHash })
      .returning();

    const session = await createSession(user.id);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token: session.token,
    };
  });

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email("Invalid email"),
      password: z.string().min(1, "Password is required"),
    })
  )
  .handler(async ({ data }) => {
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.email, data.email));
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const session = await createSession(user.id);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token: session.token,
    };
  });

export const getCurrentUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().optional() }))
  .handler(async ({ data }) => {
    if (!data.token) return null;
    return getUserFromToken(data.token);
  });

export const logoutUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.token, data.token));
    return { success: true };
  });
