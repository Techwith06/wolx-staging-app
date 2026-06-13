import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { getDb } from "./db/index.server";
import { users, sessions } from "./db/schema";

function generateToken() {
  return crypto.randomBytes(48).toString("hex");
}

export async function createSession(userId: string) {
  const db = getDb();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const [session] = await db
    .insert(sessions)
    .values({ userId, token, expiresAt })
    .returning();
  return { token, expiresAt: session.expiresAt };
}

export async function validateSession(token: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token));
  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function getUserFromToken(token: string) {
  const session = await validateSession(token);
  if (!session) return null;
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId));
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
