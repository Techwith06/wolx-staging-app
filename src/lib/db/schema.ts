import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: varchar("key_prefix", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  environment: varchar("environment", { length: 20 }).notNull().default("sandbox"),
  permissions: jsonb("permissions").notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webhooks = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baseUrl: text("base_url").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  callbackUrl: text("callback_url"),
  secretToken: text("secret_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiLogs = pgTable("api_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 10 }).notNull(),
  endpoint: text("endpoint").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const environments = pgTable("environments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  baseUrl: text("base_url").notNull(),
  type: varchar("type", { length: 20 }).notNull().default("development"),
  authType: varchar("auth_type", { length: 20 }).notNull().default("none"),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  variables: jsonb("variables").notNull().default([]),
  globalHeaders: jsonb("global_headers").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const requestLogs = pgTable("request_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 10 }).notNull(),
  endpoint: text("endpoint").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time").notNull(),
  requestBody: text("request_body"),
  responseBody: text("response_body"),
  requestHeaders: jsonb("request_headers"),
  responseHeaders: jsonb("response_headers"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  source: varchar("source", { length: 50 }).notNull().default("simulator"),
  targetUrl: text("target_url").notNull(),
  payload: jsonb("payload").notNull(),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  deliveryTime: integer("delivery_time"),
  signature: text("signature"),
  delay: integer("delay").default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  appName: varchar("app_name", { length: 255 }).notNull().default("Wolx Staging"),
  timezone: varchar("timezone", { length: 20 }).notNull().default("GMT+0"),
  dateFormat: varchar("date_format", { length: 20 }).notNull().default("DD/MM/YYYY"),
  theme: varchar("theme", { length: 20 }).notNull().default("system"),
  sidebarExpanded: boolean("sidebar_expanded").notNull().default(true),
  showIcons: boolean("show_icons").notNull().default(true),
  defaultTimeout: integer("default_timeout").notNull().default(30),
  autoSaveRequests: boolean("auto_save_requests").notNull().default(true),
  followRedirects: boolean("follow_redirects").notNull().default(true),
  notifyRequestFailed: boolean("notify_request_failed").notNull().default(true),
  notifyWebhookFailure: boolean("notify_webhook_failure").notNull().default(true),
  notifyEnvOffline: boolean("notify_env_offline").notNull().default(true),
  notifyKeyExpired: boolean("notify_key_expired").notNull().default(true),
  sessionTimeout: integer("session_timeout").notNull().default(30),
  requireReauth: boolean("require_reauth").notNull().default(true),
  twoFactorAuth: boolean("two_factor_auth").notNull().default(true),
  enableLocalhost: boolean("enable_localhost").notNull().default(true),
  allowedPorts: varchar("allowed_ports", { length: 255 }).notNull().default("3000, 5000, 8000"),
  allowSelfSignedSsl: boolean("allow_self_signed_ssl").notNull().default(true),
  allowPrivateIPs: boolean("allow_private_ips").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const savedApis = pgTable("saved_apis", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 20 }).notNull().default("v1"),
  framework: varchar("framework", { length: 50 }),
  database: varchar("database", { length: 50 }),
  auth: text("auth"),
  endpoints: jsonb("endpoints").notNull().default([]),
  schemas: jsonb("schemas").notNull().default([]),
  codeSamples: jsonb("code_samples"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
