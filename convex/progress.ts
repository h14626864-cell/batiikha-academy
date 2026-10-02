import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard, evaluateCourseCertificate } from "./lib";

/** Mark lesson complete + evaluate certificate atomically. */
export const completeLesson = mutation({
  args: { secret: v.string(), userId: v.string(), lessonId: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const lesson = (await ctx.db.get(args.lessonId as never)) as unknown as {
      _id: string;
      unitId: string;
    } | null;
    if (!lesson) throw new ConvexError("الدرس غير موجود");

    const existing = (await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", args.userId as never).eq("lessonId", args.lessonId as never)
      )
      .first()) as unknown as { _id: string } | null;
    if (!existing) {
      await ctx.db.insert("lessonProgress", {
        userId: args.userId as never,
        lessonId: args.lessonId as never,
        completedAt: Date.now(),
      });
    }

    const unit = (await ctx.db.get(lesson.unitId as never)) as unknown as { courseId: string } | null;
    const cert = unit
      ? await evaluateCourseCertificate(ctx, args.userId, unit.courseId)
      : { issued: false };
    return { ok: true, certificateIssued: cert.issued };
  },
});

export const enroll = mutation({
  args: { secret: v.string(), userId: v.string(), courseId: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const course = (await ctx.db.get(args.courseId as never)) as unknown as { isPublished: boolean } | null;
    if (!course || !course.isPublished) throw new ConvexError("الكورس غير متاح");

    const existing = (await ctx.db
      .query("enrollments")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", args.userId as never).eq("courseId", args.courseId as never)
      )
      .first()) as unknown as { _id: string } | null;
    if (existing) return { id: existing._id };
    const id = await ctx.db.insert("enrollments", {
      userId: args.userId as never,
      courseId: args.courseId as never,
      createdAt: Date.now(),
    });
    return { id };
  },
});

export const listUserEnrollments = query({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const list = (await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as never))
      .collect()) as unknown as Array<{ courseId: string }>;
    return list.map((e) => e.courseId);
  },
});
