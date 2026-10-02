import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard, evaluateCourseCertificate } from "./lib";

type ExamDoc = {
  _id: string;
  title: string;
  description: string;
  courseId: string | null; // null → standalone exam
  durationMin: number;
  openAt?: number | null;
  closeAt?: number | null;
  passScore: number;
  maxViolations: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  isPublished: boolean;
  accessToken: string;
  createdAt: number;
};

function stripDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

export const list = query({
  args: { secret: v.string(), viewerIsAdmin: v.boolean(), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    guard(args);
    let exams = (await ctx.db.query("exams").collect()) as unknown as ExamDoc[];
    if (!args.viewerIsAdmin) exams = exams.filter((e) => e.isPublished);
    exams.sort((a, b) => b.createdAt - a.createdAt);

    const out: unknown[] = [];
    for (const e of exams) {
      const course = e.courseId
        ? ((await ctx.db.get(e.courseId as never)) as unknown as { title: string } | null)
        : null;
      const questions = (await ctx.db
        .query("questions")
        .withIndex("by_exam", (q) => q.eq("examId", e._id as never))
        .collect()) as unknown as Array<{ _id: string; marks: number }>;
      const attempts = (await ctx.db
        .query("attempts")
        .withIndex("by_exam", (q) => q.eq("examId", e._id as never))
        .collect()) as unknown as Array<{ _id: string; userId: string; status: string; percentage?: number | null; passed?: boolean | null }>;
      const mine = args.viewerIsAdmin
        ? attempts.map((a) => ({ id: a._id }))
        : attempts
            .filter((a) => a.userId === args.userId)
            .map((a) => ({ id: a._id, status: a.status, percentage: a.percentage ?? null, passed: a.passed ?? null }));

      out.push({
        ...stripDoc(e),
        course: course ? { title: course.title } : null,
        questions: questions.map((q) => ({ id: q._id, marks: q.marks })),
        _count: { attempts: attempts.length, questions: questions.length },
        attempts: mine,
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
    courseId: v.optional(v.string()), // empty/omitted → standalone exam
    durationMin: v.optional(v.number()),
    openAt: v.optional(v.union(v.number(), v.null())),
    closeAt: v.optional(v.union(v.number(), v.null())),
    passScore: v.optional(v.number()),
    maxViolations: v.optional(v.number()),
    shuffleQuestions: v.optional(v.boolean()),
    showResults: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const id = await ctx.db.insert("exams", {
      title: args.title,
      description: args.description ?? "",
      courseId: (args.courseId || null) as never,
      durationMin: args.durationMin ?? 30,
      openAt: args.openAt ?? null,
      closeAt: args.closeAt ?? null,
      passScore: args.passScore ?? 50,
      maxViolations: args.maxViolations ?? 3,
      shuffleQuestions: args.shuffleQuestions ?? true,
      showResults: args.showResults ?? true,
      isPublished: args.isPublished ?? false,
      accessToken: crypto.randomUUID().replace(/-/g, ""),
      createdAt: Date.now(),
    });
    return id;
  },
});

export const adminDetail = query({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const e = (await ctx.db.get(args.id as never)) as unknown as ExamDoc | null;
    if (!e) return null;
    const course = e.courseId
      ? ((await ctx.db.get(e.courseId as never)) as unknown as { title: string } | null)
      : null;
    const questions = (await ctx.db
      .query("questions")
      .withIndex("by_exam", (q) => q.eq("examId", e._id as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; order: number }>;
    questions.sort((a, b) => a.order - b.order);

    const attempts = (await ctx.db
      .query("attempts")
      .withIndex("by_exam", (q) => q.eq("examId", e._id as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; userId: string; startedAt: number }>;
    attempts.sort((a, b) => b.startedAt - a.startedAt);
    const attemptsOut: unknown[] = [];
    for (const a of attempts) {
      const u = (await ctx.db.get(a.userId as never)) as unknown as { _id: string; name?: string | null; email: string; image?: string | null } | null;
      attemptsOut.push({
        ...stripDoc(a),
        user: u ? { id: u._id, name: u.name, email: u.email, image: u.image } : null,
      });
    }

    return { ...stripDoc(e), course: course ? { title: course.title } : null, questions: questions.map(stripDoc), attempts: attemptsOut };
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    id: v.string(),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      durationMin: v.optional(v.number()),
      openAt: v.optional(v.union(v.number(), v.null())),
      closeAt: v.optional(v.union(v.number(), v.null())),
      passScore: v.optional(v.number()),
      maxViolations: v.optional(v.number()),
      shuffleQuestions: v.optional(v.boolean()),
      showResults: v.optional(v.boolean()),
      isPublished: v.optional(v.boolean()),
    }),
    refreshToken: v.optional(v.boolean()),
    questions: v.optional(
      v.array(
        v.object({
          text: v.string(),
          type: v.optional(v.string()),
          options: v.optional(v.array(v.string())),
          correct: v.string(),
          marks: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    guard(args);
    const patch: Record<string, unknown> = { ...args.patch };
    if (args.refreshToken) patch.accessToken = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.patch(args.id as never, patch as never);

    if (Array.isArray(args.questions)) {
      const old = (await ctx.db
        .query("questions")
        .withIndex("by_exam", (q) => q.eq("examId", args.id as never))
        .collect()) as unknown as Array<{ _id: string }>;
      for (const q of old) await ctx.db.delete(q._id as never);
      const valid = args.questions.filter((q) => q.text.trim());
      let i = 0;
      for (const q of valid) {
        await ctx.db.insert("questions", {
          examId: args.id as never,
          text: q.text.trim(),
          type: q.type === "TRUE_FALSE" ? "TRUE_FALSE" : "MCQ",
          options: JSON.stringify(q.type === "TRUE_FALSE" ? ["صح", "خطأ"] : (q.options ?? []).filter((o) => o.trim())),
          correct: q.correct,
          marks: q.marks ?? 1,
          order: i++,
        });
      }
    }

    const e = (await ctx.db.get(args.id as never)) as unknown as ExamDoc;
    return stripDoc(e);
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const qts = (await ctx.db.query("questions").withIndex("by_exam", (q) => q.eq("examId", args.id as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const q of qts) await ctx.db.delete(q._id as never);
    const atts = (await ctx.db.query("attempts").withIndex("by_exam", (q) => q.eq("examId", args.id as never)).collect()) as unknown as Array<{ _id: string }>;
    for (const a of atts) {
      for (const ans of (await ctx.db.query("answers").withIndex("by_attempt", (q) => q.eq("attemptId", a._id as never)).collect()) as unknown as Array<{ _id: string }>)
        await ctx.db.delete(ans._id as never);
      await ctx.db.delete(a._id as never);
    }
    // courses referencing this exam as certExamId → clear
    for (const c of (await ctx.db.query("courses").collect()) as unknown as Array<{ _id: string; certExamId?: string | null }>)
      if (c.certExamId === args.id) await ctx.db.patch(c._id as never, { certExamId: null });
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

/** Start (or resume) an attempt via share token — full business logic from /api/exams/attempt */
export const startAttempt = mutation({
  args: { secret: v.string(), userId: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const exam = (await ctx.db
      .query("exams")
      .withIndex("by_token", (q) => q.eq("accessToken", args.token))
      .first()) as unknown as ExamDoc | null;
    if (!exam || !exam.isPublished) throw new ConvexError("الامتحان غير موجود");

    const questions = (await ctx.db
      .query("questions")
      .withIndex("by_exam", (q) => q.eq("examId", exam._id as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; order: number; marks: number }>;
    questions.sort((a, b) => a.order - b.order);
    if (questions.length === 0) throw new ConvexError("الامتحان لا يحتوي أسئلة");

    const now = Date.now();
    if (exam.openAt && now < exam.openAt) throw new Error(`الامتحان لم يفتح بعد (يفتح: ${new Date(exam.openAt).toLocaleString("ar-EG")})`);
    if (exam.closeAt && now > exam.closeAt) throw new ConvexError("الامتحان مقفل حاليًا");

    const existing = (await ctx.db
      .query("attempts")
      .withIndex("by_exam_user", (q) => q.eq("examId", exam._id as never).eq("userId", args.userId as never))
      .first()) as unknown as ({ _id: string; startedAt: number; violationCount: number; status: string } & Record<string, unknown>) | null;

    if (existing && existing.status !== "IN_PROGRESS") throw new ConvexError("لقد حاولت هذا الامتحان من قبل");

    let attemptId: string;
    let startedAt: number;
    if (existing) {
      attemptId = existing._id;
      startedAt = existing.startedAt;
    } else {
      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
      attemptId = await ctx.db.insert("attempts", {
        examId: exam._id as never,
        userId: args.userId as never,
        startedAt: now,
        status: "IN_PROGRESS",
        violations: "[]",
        violationCount: 0,
        autoSubmitted: false,
        totalMarks,
      });
      startedAt = now;
      for (const q of questions) {
        await ctx.db.insert("answers", {
          attemptId: attemptId as never,
          questionId: q._id as never,
          answer: null,
          isCorrect: false,
        });
      }
      // auto-enroll in course (only for course-linked exams)
      if (exam.courseId) {
        const enr = (await ctx.db
          .query("enrollments")
          .withIndex("by_user_course", (q) => q.eq("userId", args.userId as never).eq("courseId", exam.courseId as never))
          .first()) as unknown as { _id: string } | null;
        if (!enr) {
          await ctx.db.insert("enrollments", { userId: args.userId as never, courseId: exam.courseId as never, createdAt: now });
        }
      }
    }

    const deadline = startedAt + exam.durationMin * 60 * 1000;
    if (deadline < now) throw new ConvexError("انتهى وقت هذا الامتحان");

    const course = exam.courseId
      ? ((await ctx.db.get(exam.courseId as never)) as unknown as { _id: string; title: string } | null)
      : null;
    const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

    return {
      attempt: { id: attemptId, startedAt, violationCount: existing ? existing.violationCount : 0 },
      deadline,
      exam: {
        id: exam._id,
        title: exam.title,
        description: exam.description,
        durationMin: exam.durationMin,
        maxViolations: exam.maxViolations,
        totalMarks,
        courseId: course?._id ?? "",
        courseTitle: course?.title ?? "",
      },
      questions: questions.map((q) => ({
        id: q._id,
        text: q.text,
        type: q.type,
        options: JSON.parse((q.options as string) || "[]"),
        marks: q.marks,
      })),
    };
  },
});

/** Public exam state via token — mirrors /api/exam-public/[token] */
export const publicState = query({
  args: { secret: v.string(), userId: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const exam = (await ctx.db
      .query("exams")
      .withIndex("by_token", (q) => q.eq("accessToken", args.token))
      .first()) as unknown as ExamDoc | null;
    if (!exam || !exam.isPublished) throw new ConvexError("الامتحان غير موجود");

    const course = exam.courseId
      ? ((await ctx.db.get(exam.courseId as never)) as unknown as { _id: string; title: string } | null)
      : null;
    const questions = (await ctx.db
      .query("questions")
      .withIndex("by_exam", (q) => q.eq("examId", exam._id as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; order: number; marks: number }>;
    questions.sort((a, b) => a.order - b.order);
    const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

    const existing = (await ctx.db
      .query("attempts")
      .withIndex("by_exam_user", (q) => q.eq("examId", exam._id as never).eq("userId", args.userId as never))
      .first()) as unknown as (Record<string, unknown> & { _id: string; status: string; startedAt: number; violationCount: number }) | null;

    const now = Date.now();
    const notOpened = !!exam.openAt && now < exam.openAt;
    const closed = !!exam.closeAt && now > exam.closeAt;

    if (existing && existing.status !== "IN_PROGRESS") {
      const answers = (await ctx.db
        .query("answers")
        .withIndex("by_attempt", (q) => q.eq("attemptId", existing._id as never))
        .collect()) as unknown as Array<{ questionId: string; answer?: string | null; isCorrect: boolean }>;
      return {
        state: "FINISHED",
        exam: { id: exam._id, title: exam.title, showResults: exam.showResults, totalMarks },
        attempt: stripDoc(existing),
        answers: exam.showResults
          ? questions.map((q) => {
              const a = answers.find((x) => x.questionId === q._id);
              return {
                questionId: q._id,
                text: q.text,
                options: JSON.parse((q.options as string) || "[]"),
                correct: q.correct,
                marks: q.marks,
                given: a?.answer ?? null,
                isCorrect: a?.isCorrect ?? false,
              };
            })
          : undefined,
      };
    }

    if (existing && existing.status === "IN_PROGRESS") {
      const deadline = existing.startedAt + exam.durationMin * 60 * 1000;
      if (deadline < now) {
        return { state: "EXPIRED", message: "انتهى وقت الامتحان ولم يتم التسليم في المعاد" };
      }
      const answers = (await ctx.db
        .query("answers")
        .withIndex("by_attempt", (q) => q.eq("attemptId", existing._id as never))
        .collect()) as unknown as Array<{ questionId: string; answer?: string | null }>;
      return {
        state: "IN_PROGRESS",
        exam: {
          id: exam._id,
          title: exam.title,
          description: exam.description,
          durationMin: exam.durationMin,
          maxViolations: exam.maxViolations,
          totalMarks,
          courseId: course?._id ?? "",
          courseTitle: course?.title ?? "",
        },
        attempt: { id: existing._id, startedAt: existing.startedAt, violationCount: existing.violationCount },
        deadline,
        questions: questions.map((q) => ({
          id: q._id,
          text: q.text,
          type: q.type,
          options: JSON.parse((q.options as string) || "[]"),
          marks: q.marks,
        })),
        savedAnswers: Object.fromEntries(answers.map((a) => [a.questionId, a.answer ?? null])),
      };
    }

    return {
      state: notOpened ? "NOT_OPEN" : closed ? "CLOSED" : "READY",
      exam: {
        id: exam._id,
        title: exam.title,
        description: exam.description,
        durationMin: exam.durationMin,
        maxViolations: exam.maxViolations,
        passScore: exam.passScore,
        totalMarks,
        questionCount: questions.length,
        courseId: course?._id ?? "",
        courseTitle: course?.title ?? "",
        openAt: exam.openAt ?? null,
        closeAt: exam.closeAt ?? null,
      },
    };
  },
});

/** Submit & auto-grade — mirrors /api/attempts/[id]/submit */
export const submitAttempt = mutation({
  args: {
    secret: v.string(),
    userId: v.string(),
    attemptId: v.string(),
    answers: v.record(v.string(), v.union(v.string(), v.null())),
    auto: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const attempt = (await ctx.db.get(args.attemptId as never)) as unknown as ({ _id: string; userId: string; status: string; examId: string } & Record<string, unknown>) | null;
    if (!attempt || attempt.userId !== args.userId) throw new ConvexError("غير مسموح");
    if (attempt.status !== "IN_PROGRESS") throw new ConvexError("تم تسليم هذا الامتحان بالفعل");

    const exam = (await ctx.db.get(attempt.examId as never)) as unknown as ExamDoc;
    const questions = (await ctx.db
      .query("questions")
      .withIndex("by_exam", (q) => q.eq("examId", attempt.examId as never))
      .collect()) as unknown as Array<{ _id: string; correct: string; marks: number }>;

    const ans = args.answers ?? {};
    let score = 0;
    let total = 0;
    for (const q of questions) {
      total += q.marks;
      const given = ans[q._id];
      const isCorrect = given !== undefined && given !== null && String(given).trim() === q.correct.trim();
      if (isCorrect) score += q.marks;
      const existing = (await ctx.db
        .query("answers")
        .withIndex("by_attempt_question", (x) =>
          x.eq("attemptId", args.attemptId as never).eq("questionId", q._id as never)
        )
        .first()) as unknown as { _id: string } | null;
      if (existing) {
        await ctx.db.patch(existing._id as never, {
          answer: given !== undefined && given !== null ? String(given) : null,
          isCorrect,
        });
      }
    }

    const percentage = total > 0 ? Math.round((score / total) * 10000) / 100 : 0;
    const passed = percentage >= exam.passScore;

    await ctx.db.patch(args.attemptId as never, {
      score,
      totalMarks: total,
      percentage,
      passed,
      status: args.auto ? "AUTO_SUBMITTED" : "SUBMITTED",
      autoSubmitted: !!args.auto,
      finishedAt: Date.now(),
    });

    // course certificates only apply to course-linked exams
    const cert = exam.courseId
      ? await evaluateCourseCertificate(ctx, args.userId, exam.courseId)
      : { issued: false };

    return {
      ok: true,
      attempt: { score, totalMarks: total, percentage, passed, status: args.auto ? "AUTO_SUBMITTED" : "SUBMITTED" },
      showResults: exam.showResults,
      certificateIssued: cert.issued,
    };
  },
});

/** Anti-cheat violation logging — mirrors /api/attempts/[id]/violation */
export const recordViolation = mutation({
  args: { secret: v.string(), userId: v.string(), attemptId: v.string(), type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    guard(args);
    const attempt = (await ctx.db.get(args.attemptId as never)) as unknown as ({ _id: string; userId: string; status: string; violations: string; violationCount: number; examId: string } & Record<string, unknown>) | null;
    if (!attempt || attempt.userId !== args.userId) throw new ConvexError("غير مسموح");
    if (attempt.status !== "IN_PROGRESS") return { ok: true, ignored: true };

    const log = JSON.parse(attempt.violations || "[]") as Array<{ at: string; type: string }>;
    log.push({ at: new Date().toISOString(), type: String(args.type || "UNKNOWN") });
    const count = attempt.violationCount + 1;

    await ctx.db.patch(args.attemptId as never, {
      violations: JSON.stringify(log),
      violationCount: count,
    });

    const exam = (await ctx.db.get(attempt.examId as never)) as unknown as { maxViolations: number } | null;
    return {
      ok: true,
      violationCount: count,
      maxViolations: exam?.maxViolations ?? 3,
      autoSubmit: count >= (exam?.maxViolations ?? 3),
    };
  },
});
