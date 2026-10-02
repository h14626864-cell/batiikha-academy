import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard, evaluateCourseCertificate } from "./lib";

type AssignmentDoc = {
  _id: string;
  title: string;
  description: string;
  courseId: string;
  dueDate?: number | null;
  maxScore: number;
  allowFile: boolean;
  allowText: boolean;
  isPublished: boolean;
  createdAt: number;
};

export const list = query({
  args: { secret: v.string(), viewerIsAdmin: v.boolean(), userId: v.optional(v.string()), courseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    guard(args);
    let assignments = (await ctx.db.query("assignments").collect()) as unknown as AssignmentDoc[];
    if (args.courseId) assignments = assignments.filter((a) => a.courseId === args.courseId);
    if (!args.viewerIsAdmin) assignments = assignments.filter((a) => a.isPublished);
    assignments.sort((a, b) => b.createdAt - a.createdAt);

    const out: unknown[] = [];
    for (const a of assignments) {
      const course = (await ctx.db.get(a.courseId as never)) as unknown as { title: string } | null;
      let subs = (await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id as never))
        .collect()) as unknown as Array<Record<string, unknown> & { _id: string; userId: string; submittedAt: number }>;
      if (!args.viewerIsAdmin) subs = subs.filter((s) => s.userId === args.userId);
      subs.sort((x, y) => y.submittedAt - x.submittedAt);
      const subsOut: unknown[] = [];
      for (const s of subs) {
        const u = (await ctx.db.get(s.userId as never)) as unknown as { _id: string; name?: string | null; email: string; image?: string | null } | null;
        subsOut.push({
          ...stripDoc(s),
          user: u ? { id: u._id, name: u.name, email: u.email, image: u.image } : null,
        });
      }
      out.push({
        ...stripDoc(a),
        course: course ? { title: course.title } : null,
        _count: { submissions: subsOut.length },
        submissions: subsOut,
      });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    courseId: v.string(),
    dueDate: v.optional(v.union(v.number(), v.null())),
    maxScore: v.optional(v.number()),
    allowFile: v.optional(v.boolean()),
    allowText: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const id = await ctx.db.insert("assignments", {
      title: args.title,
      description: args.description ?? "",
      courseId: args.courseId as never,
      dueDate: args.dueDate ?? null,
      maxScore: args.maxScore ?? 100,
      allowFile: args.allowFile ?? true,
      allowText: args.allowText ?? true,
      isPublished: args.isPublished ?? true,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    id: v.string(),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      dueDate: v.optional(v.union(v.number(), v.null())),
      maxScore: v.optional(v.number()),
      allowFile: v.optional(v.boolean()),
      allowText: v.optional(v.boolean()),
      isPublished: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    guard(args);
    await ctx.db.patch(args.id as never, args.patch as never);
    const a = (await ctx.db.get(args.id as never)) as unknown as AssignmentDoc | null;
    return a ? stripDoc(a) : null;
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    for (const s of (await ctx.db.query("submissions").withIndex("by_assignment", (q) => q.eq("assignmentId", args.id as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(s._id as never);
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

export const submit = mutation({
  args: {
    secret: v.string(),
    userId: v.string(),
    assignmentId: v.string(),
    content: v.optional(v.string()),
    fileUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    guard(args);
    const assignment = (await ctx.db.get(args.assignmentId as never)) as unknown as AssignmentDoc | null;
    if (!assignment || !assignment.isPublished) throw new ConvexError("الواجب غير متاح");
    if (assignment.dueDate && assignment.dueDate < Date.now()) throw new ConvexError("انتهى موعد التسليم");

    const content = (args.content ?? "").trim();
    const fileUrl = args.fileUrl || null;
    if (!content && !fileUrl) throw new ConvexError("لا يمكن التسليم فارغًا");
    if (!assignment.allowText && !fileUrl) throw new ConvexError("هذا الواجب يقبل ملفات فقط");
    if (!assignment.allowFile && fileUrl) throw new ConvexError("هذا الواجب يقبل النص فقط");

    const existing = (await ctx.db
      .query("submissions")
      .withIndex("by_assignment_user", (q) =>
        q.eq("assignmentId", args.assignmentId as never).eq("userId", args.userId as never)
      )
      .first()) as unknown as ({ _id: string } & Record<string, unknown>) | null;

    let id: string;
    if (existing) {
      await ctx.db.patch(existing._id as never, {
        content,
        fileUrl,
        status: "SUBMITTED",
        score: null,
        feedback: null,
        gradedAt: null,
        submittedAt: Date.now(),
      });
      id = existing._id;
    } else {
      id = await ctx.db.insert("submissions", {
        assignmentId: args.assignmentId as never,
        userId: args.userId as never,
        content,
        fileUrl,
        status: "SUBMITTED",
        submittedAt: Date.now(),
        score: null,
        feedback: null,
        gradedAt: null,
      });
    }
    const doc = (await ctx.db.get(id as never)) as unknown as Record<string, unknown> & { _id: string };
    return stripDoc(doc);
  },
});

/** Admin grading + certificate evaluation atomically */
export const grade = mutation({
  args: {
    secret: v.string(),
    submissionId: v.string(),
    score: v.number(),
    feedback: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    guard(args);
    const sub = (await ctx.db.get(args.submissionId as never)) as unknown as ({ _id: string; assignmentId: string; userId: string } & Record<string, unknown>) | null;
    if (!sub) throw new ConvexError("التسليم غير موجود");

    await ctx.db.patch(args.submissionId as never, {
      score: Math.min(args.score, 9999),
      feedback: args.feedback?.trim() || null,
      status: "GRADED",
      gradedAt: Date.now(),
    });

    const assignment = (await ctx.db.get(sub.assignmentId as never)) as unknown as { courseId: string } | null;
    const cert = assignment
      ? await evaluateCourseCertificate(ctx, sub.userId, assignment.courseId)
      : { issued: false };

    const updated = (await ctx.db.get(args.submissionId as never)) as unknown as Record<string, unknown> & { _id: string };
    return { ...stripDoc(updated), certificateIssued: cert.issued };
  },
});

export function stripDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
