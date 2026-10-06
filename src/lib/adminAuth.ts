import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "nabd_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

type Payload = { exp: number };

function getSecret(): string {
  const pin = process.env.ADMIN_PIN || "1234"; // demo fallback, server-verified only
  const extra = process.env.ADMIN_SESSION_SECRET || "";
  return createHmac("sha256", `nabd-admin-v1:${extra}`).update(pin).digest("hex");
}

function hmac(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

/** Creates a signed, expiring admin session token. */
export function createAdminToken(now = Date.now()): string {
  const payload: Payload = { exp: now + MAX_AGE_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

/** Verifies signature and expiry; returns true only for valid, unexpired tokens. */
export function verifyAdminToken(token: string | undefined, now = Date.now()): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const body = token.slice(0, dot), sig = token.slice(dot + 1);
  const expected = hmac(body);
  if (sig.length !== expected.length) return false;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return typeof payload.exp === "number" && payload.exp > now;
  } catch {
    return false;
  }
}

/** Compares the submitted PIN with ADMIN_PIN using timing-safe comparison. */
export function verifyPin(pin: string): boolean {
  const expected = process.env.ADMIN_PIN || "1234";
  if (typeof pin !== "string" || pin.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
