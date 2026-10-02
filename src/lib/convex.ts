import { ConvexHttpClient } from "convex/browser";

/**
 * Server-side Convex access layer — the persistent replacement for Prisma/SQLite.
 * Every function call injects CONVEX_API_SECRET, which Convex functions verify.
 */

const url = process.env.CONVEX_URL;
const secret = process.env.CONVEX_API_SECRET ?? "";

let client: ConvexHttpClient | undefined;

function getClient(): ConvexHttpClient {
  if (!url) throw new Error("CONVEX_URL is not configured");
  if (!client) client = new ConvexHttpClient(url);
  return client;
}

export async function cxQuery<T = unknown>(
  name: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  return getClient().query(name as never, { secret, ...args } as never) as Promise<T>;
}

export async function cxMutation<T = unknown>(
  name: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  return getClient().mutation(name as never, { secret, ...args } as never) as Promise<T>;
}

/** Map a Convex error to an HTTP-friendly Arabic message + status. */
export function convexError(e: unknown, fallback = "حدث خطأ غير متوقع"): { error: string; status: number } {
  // ConvexError thrown inside a Convex function carries the user-facing
  // message in `data` (e.message is a generic "Server Error").
  const data = (e as { data?: unknown })?.data;
  const msg =
    typeof data === "string" && data.length > 0
      ? data
      : e instanceof Error
        ? e.message
        : String(e);
  if (msg.includes("غير مسموح") || msg.includes("للإدارة فقط")) return { error: msg, status: 403 };
  if (msg.includes("يجب تسجيل الدخول")) return { error: msg, status: 401 };
  if (msg.includes("غير موجود") || msg.includes("غير متاح") || msg.includes("غير موجود")) return { error: msg, status: 404 };
  return { error: msg || fallback, status: 400 };
}

// ---- serialization: Convex docs → Prisma-compatible JSON ----

const DATE_SUFFIX = "At";

function isDateKey(key: string): boolean {
  return (
    key === "dueDate" ||
    key === "deadline" ||
    key === "openAt" ||
    key === "closeAt" ||
    key.endsWith(DATE_SUFFIX)
  );
}

function walk(value: unknown, key?: string): unknown {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map((v) => walk(v));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, k);
    }
    return out;
  }
  if (typeof value === "number" && key && isDateKey(key)) {
    return new Date(value).toISOString();
  }
  return value;
}

/** Convert epoch-ms date fields to ISO strings and undefined→null (Prisma JSON parity). */
export function serialize<T>(value: T): T {
  return walk(value) as T;
}

/** Convert an incoming ISO date string to epoch ms for Convex (null/undefined pass through). */
export function toMs(input: unknown): number | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;
  const t = new Date(String(input)).getTime();
  return Number.isNaN(t) ? null : t;
}
