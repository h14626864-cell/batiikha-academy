import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard } from "./lib";

type UserDoc = {
  _id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
  banned?: boolean;
  banReason?: string;
  banUntil?: number;
};

type AppealDoc = {
  _id: string;
  userId?: string;
  email: string;
  message: string;
  status: string; // PENDING | ACCEPTED | REJECTED
  createdAt: number;
  reviewedAt?: number;
};

/** Is this ban still active? A ban with banUntil in the past auto-expires. */
function banActive(u: { banned?: boolean; banUntil?: number }, now: number): boolean {
  if (!u.banned) return false;
  if (u.banUntil && u.banUntil <= now) return false;
  return true;
}

/** Public: check whether an email is banned/blocked (used by the login ban screen). */
export const banStatus = query({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const now = Date.now();
    const email = args.email.toLowerCase().trim();

    const user = (await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()) as unknown as UserDoc | null;

    const blocked = (await ctx.db
      .query("blockedEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()) as unknown as { _id: string } | null;

    const pending = (await ctx.db
      .query("appeals")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()) as unknown as AppealDoc[];
    const hasPending = pending.some((a) => a.status === "PENDING");

    const banned = banActive(user ?? {}, now);
    return {
      banned,
      blocked: !!blocked,
      reason: banned ? user?.banReason ?? null : null,
      until: banned ? user?.banUntil ?? null : null,
      hasPendingAppeal: hasPending,
    };
  },
});

/** Admin: ban a user. days omitted/0 → permanent until unbanned or appeal accepted. */
export const ban = mutation({
  args: {
    secret: v.string(),
    userId: v.string(),
    reason: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const u = (await ctx.db.get(args.userId as never)) as unknown as UserDoc | null;
    if (!u) throw new ConvexError("الحساب غير موجود");
    if (u.role === "ADMIN") throw new ConvexError("لا يمكن حظر حساب أدمن");

    const until =
      args.days && args.days > 0 ? Date.now() + args.days * 24 * 60 * 60 * 1000 : undefined;

    await ctx.db.patch(args.userId as never, {
      banned: true,
      banReason: args.reason?.trim() || "مخالفة قوانين المنصة",
      banUntil: until, // undefined → field removed → permanent
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Admin: lift a ban. */
export const unban = mutation({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    await ctx.db.patch(args.userId as never, {
      banned: false,
      banReason: undefined,
      banUntil: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Public: a banned/blocked user submits an appeal (طعن). */
export const submitAppeal = mutation({
  args: { secret: v.string(), email: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const email = args.email.toLowerCase().trim();
    const message = args.message.trim();
    if (message.length < 5) throw new ConvexError("اكتب سبب الطعن بشكل واضح");

    const user = (await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()) as unknown as UserDoc | null;

    const blocked = (await ctx.db
      .query("blockedEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()) as unknown as { _id: string } | null;

    const banned = banActive(user ?? {}, Date.now());
    if (!banned && !blocked) throw new ConvexError("هذا الحساب غير محظور");

    const existing = (await ctx.db
      .query("appeals")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()) as unknown as AppealDoc[];
    if (existing.some((a) => a.status === "PENDING")) {
      throw new ConvexError("عندك طلب طعن بالفعل قيد المراجعة — استنى رد الإدارة");
    }

    const id = await ctx.db.insert("appeals", {
      userId: user ? (user._id as never) : undefined,
      email,
      message,
      status: "PENDING",
      createdAt: Date.now(),
    });
    return { id, ok: true };
  },
});

/** Admin: list all appeals (newest first) with user brief. */
export const listAppeals = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const rows = (await ctx.db.query("appeals").collect()) as unknown as AppealDoc[];
    rows.sort((a, b) => b.createdAt - a.createdAt);
    const out: unknown[] = [];
    for (const a of rows) {
      let user: { name?: string | null; image?: string | null; banned?: boolean } | null = null;
      if (a.userId) {
        const u = (await ctx.db.get(a.userId as never)) as unknown as UserDoc | null;
        user = u ? { name: u.name, image: u.image, banned: u.banned ?? false } : null;
      }
      out.push({
        id: a._id,
        email: a.email,
        message: a.message,
        status: a.status,
        createdAt: a.createdAt,
        reviewedAt: a.reviewedAt ?? null,
        user,
      });
    }
    return out;
  },
});

/** Admin: accept or reject an appeal. Accepting lifts the ban and unblocks the email. */
export const reviewAppeal = mutation({
  args: { secret: v.string(), appealId: v.string(), accept: v.boolean() },
  handler: async (ctx, args) => {
    guard(args);
    const appeal = (await ctx.db.get(args.appealId as never)) as unknown as AppealDoc | null;
    if (!appeal) throw new ConvexError("الطلب غير موجود");
    if (appeal.status !== "PENDING") throw new ConvexError("تم مراجعة هذا الطلب بالفعل");

    await ctx.db.patch(args.appealId as never, {
      status: args.accept ? "ACCEPTED" : "REJECTED",
      reviewedAt: Date.now(),
    });

    if (args.accept) {
      // lift the ban on the account (if it still exists)
      if (appeal.userId) {
        const u = (await ctx.db.get(appeal.userId as never)) as unknown as UserDoc | null;
        if (u) {
          await ctx.db.patch(appeal.userId as never, {
            banned: false,
            banReason: undefined,
            banUntil: undefined,
            updatedAt: Date.now(),
          });
        }
      }
      // also unblock the email (deleted-account block) so they can come back
      const blocked = (await ctx.db
        .query("blockedEmails")
        .withIndex("by_email", (q) => q.eq("email", appeal.email))
        .first()) as unknown as { _id: string } | null;
      if (blocked) await ctx.db.delete(blocked._id as never);
    }
    return { ok: true };
  },
});

/** Admin: count pending appeals (badge in the sidebar). */
export const pendingCount = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const rows = (await ctx.db
      .query("appeals")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect()) as unknown as AppealDoc[];
    return rows.length;
  },
});
