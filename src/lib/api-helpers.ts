import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cxQuery } from "@/lib/convex";

export type SessionUser = { id: string; email: string; name?: string | null; role: string };

type BanCheckUser = { banned?: boolean; banUntil?: number } | null;

function banActive(u: BanCheckUser): boolean {
  if (!u?.banned) return false;
  if (u.banUntil && u.banUntil <= Date.now()) return false;
  return true;
}

/**
 * Cached per-request ban check: a banned user loses access to every API
 * immediately, even with a still-valid JWT session.
 */
const banCache = new Map<string, { at: number; banned: boolean }>();

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const id = session.user.id;
  // 30s cache to avoid a Convex round-trip on every single call
  const cached = banCache.get(id);
  let banned = cached && Date.now() - cached.at < 30_000 ? cached.banned : null;
  if (banned === null) {
    try {
      const u = await cxQuery<BanCheckUser>("users:getById", { id });
      banned = banActive(u);
    } catch {
      banned = false; // never lock everyone out because of a transient Convex error
    }
    banCache.set(id, { at: Date.now(), banned });
  }
  if (banned) return null; // banned → treated as unauthenticated everywhere
  return {
    id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role ?? "STUDENT",
  };
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح - يجب تسجيل الدخول" }, { status: 401 });
  return user;
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح - يجب تسجيل الدخول" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "غير مسموح - للإدارة فقط" }, { status: 403 });
  return user;
}

export function isNextResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
