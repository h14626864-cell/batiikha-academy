import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { guard } from "./lib";

type CourseDoc = {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  isPublished: boolean;
  certRule: string;
  certExamId?: string | null;
  certTitle?: string | null;
  createdAt: number;
  updatedAt: number;
};

export const listAdmin = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const courses = (await ctx.db.query("courses").collect()) as unknown as CourseDoc[];
    courses.sort((a, b) => b.createdAt - a.createdAt);
    const out: unknown[] = [];
    for (const c of courses) {
      out.push({
        id: c._id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail ?? null,
        isPublished: c.isPublished,
        certRule: c.certRule,
        certExamId: c.certExamId ?? null,
        certTitle: c.certTitle ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        _count: {
          units: (await ctx.db.query("units").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
          enrollments: (await ctx.db.query("enrollments").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
          exams: (await ctx.db.query("exams").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
          assignments: (await ctx.db.query("assignments").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
        },
      });
    }
    return out;
  },
});

export const listPublished = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const courses = (await ctx.db.query("courses").collect()) as unknown as CourseDoc[];
    courses.sort((a, b) => b.createdAt - a.createdAt);
    const out: unknown[] = [];
    for (const c of courses.filter((c) => c.isPublished)) {
      out.push({
        id: c._id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail ?? null,
        isPublished: c.isPublished,
        certRule: c.certRule,
        certExamId: c.certExamId ?? null,
        certTitle: c.certTitle ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        _count: {
          units: (await ctx.db.query("units").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
          enrollments: (await ctx.db.query("enrollments").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
          exams: (await ctx.db.query("exams").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
          assignments: (await ctx.db.query("assignments").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()).length,
        },
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
    thumbnail: v.optional(v.union(v.string(), v.null())),
    certRule: v.optional(v.string()),
    certExamId: v.optional(v.union(v.string(), v.null())),
    certTitle: v.optional(v.union(v.string(), v.null())),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const now = Date.now();
    const id = await ctx.db.insert("courses", {
      title: args.title,
      description: args.description ?? "",
      thumbnail: args.thumbnail ?? null,
      isPublished: args.isPublished ?? false,
      certRule: args.certRule ?? "NONE",
      certExamId: (args.certExamId || null) as never,
      certTitle: args.certTitle ?? null,
      createdAt: now,
      updatedAt: now,
    });
    const doc = (await ctx.db.get(id as never)) as unknown as CourseDoc;
    return stripDoc(doc);
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    id: v.string(),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      thumbnail: v.optional(v.union(v.string(), v.null())),
      certRule: v.optional(v.string()),
      certTitle: v.optional(v.union(v.string(), v.null())),
      certExamId: v.optional(v.union(v.string(), v.null())),
      isPublished: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    guard(args);
    const patch: Record<string, unknown> = { ...args.patch, updatedAt: Date.now() };
    if (args.patch.certExamId !== undefined) patch.certExamId = args.patch.certExamId || null;
    await ctx.db.patch(args.id as never, patch as never);
    return (await ctx.db.get(args.id as never)) as unknown as CourseDoc;
  },
});

export const getFull = query({
  args: { secret: v.string(), id: v.string(), viewerIsAdmin: v.boolean(), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    guard(args);
    const c = (await ctx.db.get(args.id as never)) as unknown as CourseDoc | null;
    if (!c) return null;

    const units = (await ctx.db.query("units").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()) as unknown as Array<{ _id: string; title: string; order: number; courseId: string }>;
    units.sort((a, b) => a.order - b.order);
    const unitsOut: unknown[] = [];
    for (const u of units) {
      const lessons = (await ctx.db.query("lessons").withIndex("by_unit", (q) => q.eq("unitId", u._id as never)).collect()) as unknown as Array<Record<string, unknown> & { _id: string; order: number }>;
      lessons.sort((a, b) => a.order - b.order);
      unitsOut.push({
        id: u._id,
        title: u.title,
        order: u.order,
        courseId: u.courseId,
        lessons: lessons.map((l) => ({ ...stripDoc(l), unitId: u._id })),
      });
    }

    let exams = (await ctx.db.query("exams").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()) as unknown as Array<Record<string, unknown> & { _id: string }>;
    if (!args.viewerIsAdmin) exams = exams.filter((e) => e.isPublished);

    let assignments = (await ctx.db.query("assignments").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()) as unknown as Array<Record<string, unknown> & { _id: string }>;
    if (!args.viewerIsAdmin) assignments = assignments.filter((a) => a.isPublished);

    const enrollments = (await ctx.db.query("enrollments").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()) as unknown as Array<{ _id: string }>;

    let enrolled = false;
    let completedLessonIds: string[] = [];
    if (!args.viewerIsAdmin && args.userId) {
      const e = (await ctx.db.query("enrollments").withIndex("by_user_course", (q) => q.eq("userId", args.userId as never).eq("courseId", c._id as never)).first()) as unknown as { _id: string } | null;
      enrolled = !!e;
      const progress = (await ctx.db.query("lessonProgress").withIndex("by_user", (q) => q.eq("userId", args.userId as never)).collect()) as unknown as Array<{ lessonId: string }>;
      const lessonIdSet = new Set<string>();
      for (const u of units) {
        for (const l of (await ctx.db.query("lessons").withIndex("by_unit", (q) => q.eq("unitId", u._id as never)).collect()) as unknown as Array<{ _id: string }>)
          lessonIdSet.add(l._id);
      }
      completedLessonIds = progress.filter((p) => lessonIdSet.has(p.lessonId)).map((p) => p.lessonId);
    }

    return {
      ...stripDoc(c),
      units: unitsOut,
      exams: exams.map(stripDoc),
      assignments: assignments.map(stripDoc),
      _count: { enrollments: enrollments.length },
      enrolled,
      completedLessonIds,
    };
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const cid = args.id;
    const units = (await ctx.db.query("units").withIndex("by_course", (q) => q.eq("courseId", cid as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const u of units) {
      const lessons = (await ctx.db.query("lessons").withIndex("by_unit", (q) => q.eq("unitId", u._id as never)).collect()) as unknown as Array<{ _id: string }>;
      for (const l of lessons) {
        for (const p of (await ctx.db.query("lessonProgress").withIndex("by_lesson", (q) => q.eq("lessonId", l._id as never)).collect()) as unknown as Array<{ _id: string }>)
          await ctx.db.delete(p._id as never);
        await ctx.db.delete(l._id as never);
      }
      await ctx.db.delete(u._id as never);
    }
    const exams = (await ctx.db.query("exams").withIndex("by_course", (q) => q.eq("courseId", cid as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const ex of exams) {
      const qts = (await ctx.db.query("questions").withIndex("by_exam", (q) => q.eq("examId", ex._id as never)).collect()) as unknown as Array<{ _id: string }>;
      for (const q of qts) await ctx.db.delete(q._id as never);
      const atts = (await ctx.db.query("attempts").withIndex("by_exam", (q) => q.eq("examId", ex._id as never)).collect()) as unknown as Array<{ _id: string }>;
      for (const a of atts) {
        for (const ans of (await ctx.db.query("answers").withIndex("by_attempt", (q) => q.eq("attemptId", a._id as never)).collect()) as unknown as Array<{ _id: string }>)
          await ctx.db.delete(ans._id as never);
        await ctx.db.delete(a._id as never);
      }
      await ctx.db.delete(ex._id as never);
    }
    const assignments = (await ctx.db.query("assignments").withIndex("by_course", (q) => q.eq("courseId", cid as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const asg of assignments) {
      for (const s of (await ctx.db.query("submissions").withIndex("by_assignment", (q) => q.eq("assignmentId", asg._id as never)).collect()) as unknown as Array<{ _id: string }>)
        await ctx.db.delete(s._id as never);
      await ctx.db.delete(asg._id as never);
    }
    for (const e of (await ctx.db.query("enrollments").withIndex("by_course", (q) => q.eq("courseId", cid as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(e._id as never);
    for (const cert of (await ctx.db.query("certificates").collect()) as unknown as Array<{ _id: string; courseId?: string | null }>)
      if (cert.courseId === cid) await ctx.db.delete(cert._id as never);
    await ctx.db.delete(cid as never);
    return { ok: true };
  },
});

// ---- units ----

export const createUnit = mutation({
  args: { secret: v.string(), courseId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const count = (await ctx.db.query("units").withIndex("by_course", (q) => q.eq("courseId", args.courseId as never)).collect()).length;
    const id = await ctx.db.insert("units", {
      title: args.title,
      courseId: args.courseId as never,
      order: count,
    });
    return { id, title: args.title, courseId: args.courseId, order: count };
  },
});

export const updateUnit = mutation({
  args: { secret: v.string(), id: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    await ctx.db.patch(args.id as never, { title: args.title });
    const u = (await ctx.db.get(args.id as never)) as unknown as { _id: string; title: string; order: number; courseId: string } | null;
    return u ? { id: u._id, title: u.title, order: u.order, courseId: u.courseId } : null;
  },
});

export const deleteUnit = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const lessons = (await ctx.db.query("lessons").withIndex("by_unit", (q) => q.eq("unitId", args.id as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const l of lessons) {
      for (const p of (await ctx.db.query("lessonProgress").withIndex("by_lesson", (q) => q.eq("lessonId", l._id as never)).collect()) as unknown as Array<{ _id: string }>)
        await ctx.db.delete(p._id as never);
      await ctx.db.delete(l._id as never);
    }
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

// ---- lessons ----

export const createLesson = mutation({
  args: {
    secret: v.string(),
    unitId: v.string(),
    title: v.string(),
    type: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    guard(args);
    const count = (await ctx.db.query("lessons").withIndex("by_unit", (q) => q.eq("unitId", args.unitId as never)).collect()).length;
    const now = Date.now();
    const id = await ctx.db.insert("lessons", {
      title: args.title,
      type: args.type,
      content: args.content,
      unitId: args.unitId as never,
      order: count,
      createdAt: now,
    });
    return { id, title: args.title, type: args.type, content: args.content, unitId: args.unitId, order: count, createdAt: now };
  },
});

export const updateLesson = mutation({
  args: {
    secret: v.string(),
    id: v.string(),
    patch: v.object({
      title: v.optional(v.string()),
      type: v.optional(v.string()),
      content: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    guard(args);
    await ctx.db.patch(args.id as never, args.patch as never);
    const l = (await ctx.db.get(args.id as never)) as unknown as Record<string, unknown> & { _id: string } | null;
    return l ? stripDoc(l) : null;
  },
});

export const deleteLesson = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    for (const p of (await ctx.db.query("lessonProgress").withIndex("by_lesson", (q) => q.eq("lessonId", args.id as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(p._id as never);
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

/** lesson + its unit + course (used by progress completion flow) */
export const lessonWithContext = query({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const l = (await ctx.db.get(args.id as never)) as unknown as Record<string, unknown> & { _id: string; unitId: string } | null;
    if (!l) return null;
    const unit = (await ctx.db.get(l.unitId as never)) as unknown as { _id: string; courseId: string } | null;
    const course = unit ? ((await ctx.db.get(unit.courseId as never)) as unknown as { _id: string } | null) : null;
    return { ...stripDoc(l), unit: unit ? { id: unit._id, courseId: unit.courseId } : null, courseId: course?._id ?? null };
  },
});

export function stripDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
