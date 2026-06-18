import "server-only";
import { nanoid } from "nanoid";
import type { NextResponse } from "next/server";

/**
 * Per-visitor identity for multi-tenant Corsair.
 *
 * Each browser gets an anonymous, httpOnly cookie holding a stable Corsair
 * tenant id. Drive import and publish run as *that* tenant, so every visitor
 * reads/writes their own Google account — never the deploy owner's. Research
 * stays on the shared system tenant (read-only public web), so it needs no
 * per-visitor identity.
 */

export const VISITOR_COOKIE = "sf_tenant";

const VISITOR_RE = /^sf_[A-Za-z0-9_-]{6,}$/;

/** Read the visitor's tenant id from the request cookie, if present and valid. */
export function readVisitorTenantId(req: Request): string | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)sf_tenant=([^;]+)/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return value && VISITOR_RE.test(value) ? value : null;
}

/** Mint a fresh tenant id to use as a Corsair tenant id for a new visitor. */
export function newVisitorTenantId(): string {
  return `sf_${nanoid()}`;
}

/** Persist the visitor's tenant id on a response (1 year, httpOnly). */
export function setVisitorCookie(res: NextResponse, tenantId: string): void {
  res.cookies.set(VISITOR_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
