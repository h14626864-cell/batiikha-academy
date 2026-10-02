import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard, makeSerial, issueCertificateIfMissing } from "./lib";

export const listForUser = query({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const certs = (await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; userId: string; courseId?: string | null; issuedAt: number }>;
    certs.sort((a, b) => b.issuedAt - a.issuedAt);
    const out: unknown[] = [];
    for (const c of certs) {
      const user = (await ctx.db.get(c.userId as never)) as unknown as { name?: string | null; email: string } | null;
      const course = c.courseId ? ((await ctx.db.get(c.courseId as never)) as unknown as { title: string } | null) : null;
      out.push({
        ...stripDoc(c),
        course: course ? { title: course.title } : null,
        user: user ? { name: user.name, email: user.email } : null,
      });
    }
    return out;
  },
});

/** Admin manual issue (no course binding) */
export const issueManual = mutation({
  args: {
    secret: v.string(),
    userId: v.string(),
    title: v.string(),
    reason: v.optional(v.string()),
    score: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    guard(args);
    const user = (await ctx.db.get(args.userId as never)) as unknown as { name?: string | null; email: string } | null;
    if (!user) throw new ConvexError("الطالب غير موجود");
    const now = Date.now();
    const id = await ctx.db.insert("certificates", {
      serial: makeSerial(),
      userId: args.userId as never,
      courseId: null,
      title: args.title,
      reason: args.reason?.trim() || "شهادة تقدير من إدارة المنصة",
      score: args.score ?? null,
      issuedAt: now,
    });
    const doc = (await ctx.db.get(id as never)) as unknown as Record<string, unknown> & { _id: string };
    return { ...stripDoc(doc), user: { name: user.name, email: user.email } };
  },
});

/** Admin: evaluate + issue for a specific course (used by admin panel buttons) */
export const issueForCourse = mutation({
  args: { secret: v.string(), userId: v.string(), courseId: v.string(), title: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    guard(args);
    return issueCertificateIfMissing(ctx, args.userId, args.courseId, args.title, args.reason ?? "شهادة تقدير من إدارة المنصة");
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

export function stripDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
