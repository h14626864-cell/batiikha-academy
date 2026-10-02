import { QueryCtx, MutationCtx } from "./_generated/server";

export type Ctx = QueryCtx | MutationCtx;

/**
 * Every Convex function is guarded by a shared secret passed from the
 * Next.js server (CONVEX_API_SECRET). This keeps randoms who learn the
 * deployment URL from reading/writing data directly.
 */
export function assertSecret(secret: unknown): void {
  if (!process.env.CONVEX_API_SECRET || secret !== process.env.CONVEX_API_SECRET) {
    throw new Error("Unauthorized: invalid API secret");
  }
}

type WithSecret = { secret: string };

export function guard<A extends Record<string, unknown>>(args: A): Omit<A, "secret"> {
  assertSecret((args as unknown as WithSecret).secret);
  const { secret: _s, ...rest } = args as unknown as WithSecret & A;
  return rest;
}

export async function nowMs(): Promise<number> {
  return Date.now();
}

// ---- shared helpers ----

export async function getDoc<T>(ctx: QueryCtx | MutationCtx, table: string, id: string): Promise<T | null> {
  return (await ctx.db.get(id as never)) as unknown as T | null;
}

/** best exam percentage across finished attempts of a user (optionally per course) */
export async function bestExamPercentage(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  courseId?: string
): Promise<number> {
  const attempts = (await ctx.db
    .query("attempts")
    .withIndex("by_user", (q) => q.eq("userId", userId as never))
    .collect()) as unknown as Array<{
    _id: string;
    examId: string;
    status: string;
    percentage?: number | null;
  }>;
  let best = 0;
  for (const a of attempts) {
    if (a.status !== "SUBMITTED" && a.status !== "AUTO_SUBMITTED") continue;
    if (a.percentage === null || a.percentage === undefined) continue;
    if (courseId) {
      const exam = (await ctx.db.get(a.examId as never)) as unknown as { courseId: string | null } | null;
      if (!exam || exam.courseId !== courseId) continue;
    }
    best = Math.max(best, a.percentage);
  }
  return best;
}

/** create a certificate if none exists for (userId, courseId) */
export async function issueCertificateIfMissing(
  ctx: MutationCtx,
  userId: string,
  courseId: string,
  title: string,
  reason: string
): Promise<{ issued: boolean; certificateId?: string }> {
  const existing = (await ctx.db
    .query("certificates")
    .withIndex("by_user_course", (q) => q.eq("userId", userId as never).eq("courseId", courseId as never))
    .first()) as unknown as { _id: string } | null;
  if (existing) return { issued: false, certificateId: existing._id };

  const now = Date.now();
  const id = await ctx.db.insert("certificates", {
    serial: makeSerial(),
    userId: userId as never,
    courseId: courseId as never,
    title,
    reason,
    score: await bestExamPercentage(ctx, userId, courseId) || undefined,
    issuedAt: now,
  });
  return { issued: true, certificateId: id as string };
}

export function makeSerial(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `BT-${s.slice(0, 5)}-${s.slice(5)}`;
}

/** Evaluate the course certRule and issue if satisfied. */
export async function evaluateCourseCertificate(
  ctx: MutationCtx,
  userId: string,
  courseId: string
): Promise<{ issued: boolean; certificateId?: string }> {
  const course = (await ctx.db.get(courseId as never)) as unknown as {
    certRule: string;
    certExamId?: string | null;
    certTitle?: string | null;
    title: string;
  } | null;
  if (!course || course.certRule === "NONE") return { issued: false };

  const existing = (await ctx.db
    .query("certificates")
    .withIndex("by_user_course", (q) => q.eq("userId", userId as never).eq("courseId", courseId as never))
    .first()) as unknown as { _id: string } | null;
  if (existing) return { issued: false, certificateId: existing._id };

  let ok = false;
  let reason = "";

  switch (course.certRule) {
    case "ALL_LESSONS": {
      ok = await allLessonsDone(ctx, userId, courseId);
      reason = "إكمال جميع دروس الكورس";
      break;
    }
    case "EXAM_PASS": {
      ok = await passedExam(ctx, userId, course.certExamId ?? "");
      reason = "النجاح في الامتحان النهائي";
      break;
    }
    case "LESSONS_AND_EXAM": {
      ok =
        (await allLessonsDone(ctx, userId, courseId)) &&
        (await passedExam(ctx, userId, course.certExamId ?? ""));
      reason = "إكمال جميع الدروس والنجاح في الامتحان النهائي";
      break;
    }
    case "ALL_TASKS": {
      ok = await allTasksDone(ctx, userId, courseId);
      reason = "إنجاز جميع الواجبات والامتحانات";
      break;
    }
  }

  if (!ok) return { issued: false };

  return issueCertificateIfMissing(
    ctx,
    userId,
    courseId,
    course.certTitle?.trim() || course.title,
    reason
  );
}

async function allLessonsDone(ctx: QueryCtx | MutationCtx, userId: string, courseId: string): Promise<boolean> {
  const units = (await ctx.db
    .query("units")
    .withIndex("by_course", (q) => q.eq("courseId", courseId as never))
    .collect()) as unknown as Array<{ _id: string }>;
  if (units.length === 0) return false;
  let total = 0;
  let done = 0;
  for (const u of units) {
    const lessons = (await ctx.db
      .query("lessons")
      .withIndex("by_unit", (q) => q.eq("unitId", u._id as never))
      .collect()) as unknown as Array<{ _id: string }>;
    total += lessons.length;
    for (const l of lessons) {
      const p = (await ctx.db
        .query("lessonProgress")
        .withIndex("by_user_lesson", (q) => q.eq("userId", userId as never).eq("lessonId", l._id as never))
        .first()) as unknown as { _id: string } | null;
      if (p) done++;
    }
  }
  return total > 0 && done >= total;
}

async function passedExam(ctx: QueryCtx | MutationCtx, userId: string, examId: string): Promise<boolean> {
  if (!examId) return false;
  const attempts = (await ctx.db
    .query("attempts")
    .withIndex("by_exam_user", (q) => q.eq("examId", examId as never).eq("userId", userId as never))
    .collect()) as unknown as Array<{ status: string; passed?: boolean | null }>;
  return attempts.some(
    (a) => a.passed === true && (a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED")
  );
}

async function allTasksDone(ctx: QueryCtx | MutationCtx, userId: string, courseId: string): Promise<boolean> {
  const exams = (await ctx.db
    .query("exams")
    .withIndex("by_course", (q) => q.eq("courseId", courseId as never))
    .collect()) as unknown as Array<{ _id: string; isPublished: boolean }>;
  const publishedExams = exams.filter((e) => e.isPublished);
  for (const ex of publishedExams) {
    const atts = (await ctx.db
      .query("attempts")
      .withIndex("by_exam_user", (q) => q.eq("examId", ex._id as never).eq("userId", userId as never))
      .collect()) as unknown as Array<{ status: string }>;
    if (!atts.some((a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED")) return false;
  }
  const assignments = (await ctx.db
    .query("assignments")
    .withIndex("by_course", (q) => q.eq("courseId", courseId as never))
    .collect()) as unknown as Array<{ _id: string; isPublished: boolean }>;
  const publishedAssignments = assignments.filter((a) => a.isPublished);
  for (const asg of publishedAssignments) {
    const subs = (await ctx.db
      .query("submissions")
      .withIndex("by_assignment_user", (q) =>
        q.eq("assignmentId", asg._id as never).eq("userId", userId as never)
      )
      .collect()) as unknown as Array<{ status: string }>;
    if (!subs.some((s) => s.status === "GRADED")) return false;
  }
  return publishedExams.length + publishedAssignments.length > 0;
}
