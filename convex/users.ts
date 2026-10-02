import { query, mutation, QueryCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard } from "./lib";

type UserDoc = {
  _id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  passwordHash?: string | null;
  role: string;
  hidden?: boolean;
  banned?: boolean;
  banReason?: string;
  banUntil?: number;
  createdAt: number;
  updatedAt: number;
};

/** auth: find user by email incl. passwordHash (server-only usage) */
export const getByEmail = query({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const user = (await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()) as unknown as UserDoc | null;
    return user;
  },
});

export const getById = query({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    return (await ctx.db.get(args.id as never)) as unknown as UserDoc | null;
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    email: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    passwordHash: v.optional(v.union(v.string(), v.null())),
    role: v.optional(v.string()),
    hidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const existing = (await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()) as unknown as UserDoc | null;
    if (existing) throw new ConvexError("Email already registered");
    const now = Date.now();
    const id = await ctx.db.insert("users", {
      email: args.email,
      name: args.name ?? null,
      passwordHash: args.passwordHash ?? null,
      image: null,
      role: args.role ?? "STUDENT",
      hidden: args.hidden ?? false,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/** Set/unset the hidden flag on a user (hidden admins are invisible in every list). */
export const setHidden = mutation({
  args: { secret: v.string(), userId: v.string(), hidden: v.boolean() },
  handler: async (ctx, args) => {
    guard(args);
    await ctx.db.patch(args.userId as never, { hidden: args.hidden, updatedAt: Date.now() });
    return { ok: true };
  },
});

/** OAuth sign-in: find or create by email (Google self-registration/linking) */
export const findOrCreateOAuth = mutation({
  args: {
    secret: v.string(),
    email: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    guard(args);
    // blocked by admin → OAuth sign-in is refused entirely
    const blocked = (await ctx.db
      .query("blockedEmails")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()) as unknown as { _id: string } | null;
    if (blocked) throw new ConvexError("هذا البريد محظور من قبل الإدارة — لا يمكنك إنشاء حساب جديد");

    const existing = (await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()) as unknown as UserDoc | null;
    if (existing) return existing._id;
    const now = Date.now();
    const id = await ctx.db.insert("users", {
      email: args.email,
      name: args.name ?? args.email.split("@")[0],
      image: args.image ?? null,
      passwordHash: null,
      role: "STUDENT",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Platform owner emails — these accounts ALWAYS enter as ADMIN.
 * Mirrors PLATFORM_ADMIN_EMAILS in src/lib/auth.ts (defense in depth).
 */
const PLATFORM_ADMIN_EMAILS: readonly string[] = ["mohamed.aln3nashy@gmail.com"];

/**
 * OAuth sign-in for platform owners: find or create the account with role ADMIN,
 * lift any ban and remove the email from blockedEmails (owners can never be locked out).
 */
export const ensureAdminOAuth = mutation({
  args: {
    secret: v.string(),
    email: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    guard(args);
    const email = args.email.toLowerCase().trim();
    if (!PLATFORM_ADMIN_EMAILS.includes(email)) {
      throw new ConvexError("غير مسموح - هذا البريد ليس من قائمة ملاك المنصة");
    }

    // owners can never be blocked
    const blocked = (await ctx.db
      .query("blockedEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()) as unknown as { _id: string } | null;
    if (blocked) await ctx.db.delete(blocked._id as never);

    const now = Date.now();
    const existing = (await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()) as unknown as UserDoc | null;
    if (existing) {
      if (existing.role !== "ADMIN" || existing.banned) {
        await ctx.db.patch(existing._id as never, {
          role: "ADMIN",
          banned: false,
          banReason: undefined,
          banUntil: undefined,
          updatedAt: now,
        });
      }
      return { id: existing._id, role: "ADMIN" as const };
    }

    const id = await ctx.db.insert("users", {
      email,
      name: args.name ?? email.split("@")[0],
      image: args.image ?? null,
      passwordHash: null,
      role: "ADMIN",
      createdAt: now,
      updatedAt: now,
    });
    return { id, role: "ADMIN" as const };
  },
});

/** Admin list with per-student aggregates (mirrors /api/admin/students shape) */
export const listWithSummary = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const allUsers = (await ctx.db.query("users").collect()) as unknown as UserDoc[];
    // hidden accounts (stealth admins) never appear in the admin users list
    const users = allUsers.filter((u) => !u.hidden);
    users.sort((a, b) => b.createdAt - a.createdAt);
    const out: unknown[] = [];
    for (const u of users) {
      const enrollments = (await ctx.db
        .query("enrollments")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ _id: string }>;
      const progress = (await ctx.db
        .query("lessonProgress")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ _id: string }>;
      const attempts = (await ctx.db
        .query("attempts")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{
        status: string;
        percentage?: number | null;
        passed?: boolean | null;
        violationCount: number;
      }>;
      const finished = attempts.filter(
        (a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED"
      );
      const submissions = (await ctx.db
        .query("submissions")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ status: string; score?: number | null }>;
      const certificates = (await ctx.db
        .query("certificates")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ _id: string; title: string }>;

      out.push({
        id: u._id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        banned: u.banned ?? false,
        banReason: u.banReason ?? null,
        banUntil: u.banUntil ?? null,
        createdAt: u.createdAt,
        summary: {
          enrolled: enrollments.length,
          lessonsDone: progress.length,
          examsTaken: finished.length,
          avgScore:
            finished.length > 0
              ? Math.round(
                  finished.reduce((s, a) => s + (a.percentage ?? 0), 0) / finished.length
                )
              : null,
          violations: finished.reduce((s, a) => s + a.violationCount, 0),
          assignmentsSubmitted: submissions.length,
          assignmentsGraded: submissions.filter((s) => s.status === "GRADED").length,
          certificates: certificates.length,
        },
      });
    }
    return out;
  },
});

/** Admin: full detail for one student */
export const detailForAdmin = query({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const u = (await ctx.db.get(args.id as never)) as unknown as UserDoc | null;
    if (!u) return null;

    const enrollments = (await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", u._id as never))
      .collect()) as unknown as Array<{ _id: string; courseId: string; createdAt: number }>;
    const enrollmentsOut: unknown[] = [];
    for (const e of enrollments) {
      const course = (await ctx.db.get(e.courseId as never)) as unknown as { title: string } | null;
      enrollmentsOut.push({
        id: e._id,
        course: course ? { id: e.courseId, title: course.title } : null,
      });
    }

    const progress = (await ctx.db
      .query("lessonProgress")
      .withIndex("by_user", (q) => q.eq("userId", u._id as never))
      .collect()) as unknown as Array<{ _id: string; lessonId: string; completedAt: number }>;
    progress.sort((a, b) => b.completedAt - a.completedAt);
    const progressOut: unknown[] = [];
    for (const p of progress.slice(0, 30)) {
      const lesson = (await ctx.db.get(p.lessonId as never)) as unknown as {
        title: string;
        unitId: string;
      } | null;
      if (!lesson) continue;
      const unit = (await ctx.db.get(lesson.unitId as never)) as unknown as {
        title: string;
        courseId: string;
      } | null;
      const course = unit
        ? ((await ctx.db.get(unit.courseId as never)) as unknown as { title: string } | null)
        : null;
      progressOut.push({
        id: p._id,
        lesson: {
          id: p.lessonId,
          title: lesson.title,
          unit: { title: unit?.title ?? "", course: { title: course?.title ?? "" } },
        },
      });
    }

    const attempts = (await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", u._id as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; examId: string; startedAt: number }>;
    attempts.sort((a, b) => b.startedAt - a.startedAt);
    const attemptsOut: unknown[] = [];
    for (const a of attempts) {
      const exam = (await ctx.db.get(a.examId as never)) as unknown as {
        title: string;
        courseId: string;
      } | null;
      attemptsOut.push({
        ...strip(a),
        exam: exam ? { id: a.examId, title: exam.title, course: { title: exam.courseId ? (await getCourseTitle(ctx, a.examId)) : "" } } : null,
      });
    }

    const submissions = (await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("userId", u._id as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; assignmentId: string; submittedAt: number }>;
    submissions.sort((a, b) => b.submittedAt - a.submittedAt);
    const submissionsOut: unknown[] = [];
    for (const s of submissions) {
      const asg = (await ctx.db.get(s.assignmentId as never)) as unknown as {
        title: string;
        maxScore: number;
        courseId: string;
      } | null;
      submissionsOut.push({
        ...strip(s),
        assignment: asg
          ? {
              id: s.assignmentId,
              title: asg.title,
              maxScore: asg.maxScore,
              course: { title: await getCourseTitleOf(ctx, asg.courseId) },
            }
          : null,
      });
    }

    const certificates = (await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", u._id as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; issuedAt: number }>;
    certificates.sort((a, b) => b.issuedAt - a.issuedAt);

    return {
      user: { id: u._id, name: u.name, email: u.email, image: u.image, role: u.role, createdAt: u.createdAt },
      enrollments: enrollmentsOut,
      lessonProgress: progressOut,
      attempts: attemptsOut,
      submissions: submissionsOut,
      certificates: certificates.map(strip),
    };
  },
});

export const updateRole = mutation({
  args: { secret: v.string(), userId: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    await ctx.db.patch(args.userId as never, { role: args.role, updatedAt: Date.now() });
    return { ok: true };
  },
});

/** Set/replace a user's password hash (migration + admin password resets). */
export const setPassword = mutation({
  args: { secret: v.string(), userId: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const u = await ctx.db.get(args.userId as never);
    if (!u) throw new ConvexError("غير موجود");
    await ctx.db.patch(args.userId as never, { passwordHash: args.passwordHash, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const uid = args.id;
    // block the email so the deleted user can never sign up again (Google or password)
    const target = (await ctx.db.get(uid as never)) as unknown as { email: string; name?: string | null } | null;
    if (!target) return { ok: true };
    const alreadyBlocked = (await ctx.db
      .query("blockedEmails")
      .withIndex("by_email", (q) => q.eq("email", target.email))
      .first()) as unknown as { _id: string } | null;
    if (!alreadyBlocked) {
      await ctx.db.insert("blockedEmails", {
        email: target.email.toLowerCase().trim(),
        name: target.name ?? null,
        blockedAt: Date.now(),
      });
    }
    // cascade
    for (const p of (await ctx.db.query("lessonProgress").withIndex("by_user", (q) => q.eq("userId", uid as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(p._id as never);
    for (const e of (await ctx.db.query("enrollments").withIndex("by_user", (q) => q.eq("userId", uid as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(e._id as never);
    const subs = (await ctx.db.query("submissions").withIndex("by_user", (q) => q.eq("userId", uid as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const s of subs) await ctx.db.delete(s._id as never);
    const atts = (await ctx.db.query("attempts").withIndex("by_user", (q) => q.eq("userId", uid as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const a of atts) {
      for (const ans of (await ctx.db.query("answers").withIndex("by_attempt", (q) => q.eq("attemptId", a._id as never)).collect()) as unknown as Array<{ _id: string }>)
        await ctx.db.delete(ans._id as never);
      await ctx.db.delete(a._id as never);
    }
    for (const c of (await ctx.db.query("certificates").withIndex("by_user", (q) => q.eq("userId", uid as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(c._id as never);
    for (const c of (await ctx.db.query("comments").withIndex("by_user", (q) => q.eq("userId", uid as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(c._id as never);
    for (const p of (await ctx.db.query("posts").withIndex("by_user", (q) => q.eq("userId", uid as never)).collect()) as unknown as Array<{ _id: string }>) {
      for (const cm of (await ctx.db.query("comments").withIndex("by_post", (q) => q.eq("postId", p._id as never)).collect()) as unknown as Array<{ _id: string }>)
        await ctx.db.delete(cm._id as never);
      await ctx.db.delete(p._id as never);
    }
    await ctx.db.delete(uid as never);
    return { ok: true };
  },
});

/** Blocked emails — admin management */
export const listBlocked = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const rows = (await ctx.db.query("blockedEmails").collect()) as unknown as Array<Record<string, unknown> & { _id: string; email: string; name?: string | null; blockedAt: number }>;
    rows.sort((a, b) => b.blockedAt - a.blockedAt);
    return rows.map(strip);
  },
});

export const isEmailBlocked = query({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const hit = (await ctx.db
      .query("blockedEmails")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()) as unknown as { _id: string } | null;
    return !!hit;
  },
});

export const unblockEmail = mutation({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const hit = (await ctx.db
      .query("blockedEmails")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()) as unknown as { _id: string } | null;
    if (hit) await ctx.db.delete(hit._id as never);
    return { ok: true };
  },
});

async function getCourseTitle(ctx: QueryCtx, examId: string): Promise<string> {
  const exam = (await ctx.db.get(examId as never)) as unknown as { courseId: string } | null;
  if (!exam) return "";
  return getCourseTitleOf(ctx, exam.courseId);
}

async function getCourseTitleOf(ctx: QueryCtx, courseId: string): Promise<string> {
  const course = (await ctx.db.get(courseId as never)) as unknown as { title: string } | null;
  return course?.title ?? "";
}

function strip<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
