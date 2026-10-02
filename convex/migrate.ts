import { mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard } from "./lib";

/**
 * One-time migration: seed the Convex deployment from exported SQLite JSON.
 * IDs are remapped old→new via an in-memory map; dates arrive as ISO strings
 * and are stored as epoch ms.
 */
const ms = (d: unknown): number | null => {
  if (d === null || d === undefined) return null;
  const t = new Date(d as string).getTime();
  return Number.isNaN(t) ? null : t;
};

const dataShape = v.object({
  users: v.array(v.any()),
  courses: v.array(v.any()),
  units: v.array(v.any()),
  lessons: v.array(v.any()),
  lessonProgress: v.array(v.any()),
  enrollments: v.array(v.any()),
  assignments: v.array(v.any()),
  assignmentSubmissions: v.array(v.any()),
  exams: v.array(v.any()),
  questions: v.array(v.any()),
  examAttempts: v.array(v.any()),
  examAnswers: v.array(v.any()),
  certificates: v.array(v.any()),
  posts: v.array(v.any()),
  comments: v.array(v.any()),
  dictionaryWords: v.array(v.any()),
  extraUsers: v.optional(v.array(v.any())),
});

export const seedAll = mutation({
  args: { secret: v.string(), data: dataShape },
  handler: async (ctx, args) => {
    guard(args);
    const d = args.data;
    const map: Record<string, string> = {}; // old id -> new id
    const ref = (old: unknown): never => {
      const key = String(old);
      const mapped = map[key];
      if (!mapped) throw new Error(`Unmapped id reference: ${key}`);
      return mapped as never;
    };

    const count = await ctx.db.query("users").collect();
    if (count.length > 0) throw new ConvexError("Deployment not empty — refusing to seed");

    // 1. users (merge extra users harvested from the live server)
    for (const u of [...d.users, ...(d.extraUsers ?? [])]) {
      const id = await ctx.db.insert("users", {
        email: u.email,
        name: u.name ?? null,
        image: u.image ?? null,
        passwordHash: u.passwordHash ?? null,
        role: u.role ?? "STUDENT",
        createdAt: ms(u.createdAt) ?? Date.now(),
        updatedAt: ms(u.updatedAt) ?? Date.now(),
      });
      map[u.id] = id;
    }

    // 2. courses (certExamId patched after exams)
    for (const c of d.courses) {
      const id = await ctx.db.insert("courses", {
        title: c.title,
        description: c.description ?? "",
        thumbnail: c.thumbnail ?? null,
        isPublished: !!c.isPublished,
        certRule: c.certRule ?? "NONE",
        certTitle: c.certTitle ?? null,
        createdAt: ms(c.createdAt) ?? Date.now(),
        updatedAt: ms(c.updatedAt) ?? Date.now(),
      });
      map[c.id] = id;
    }

    // 3. units
    for (const u of d.units) {
      const id = await ctx.db.insert("units", {
        title: u.title,
        order: u.order ?? 0,
        courseId: ref(u.courseId),
      });
      map[u.id] = id;
    }

    // 4. lessons
    for (const l of d.lessons) {
      const id = await ctx.db.insert("lessons", {
        title: l.title,
        type: l.type ?? "TEXT",
        content: l.content ?? "",
        order: l.order ?? 0,
        unitId: ref(l.unitId),
        createdAt: ms(l.createdAt) ?? Date.now(),
      });
      map[l.id] = id;
    }

    // 5. exams
    for (const e of d.exams) {
      const id = await ctx.db.insert("exams", {
        title: e.title,
        description: e.description ?? "",
        courseId: ref(e.courseId),
        durationMin: e.durationMin ?? 30,
        openAt: ms(e.openAt),
        closeAt: ms(e.closeAt),
        passScore: e.passScore ?? 50,
        maxViolations: e.maxViolations ?? 3,
        shuffleQuestions: !!e.shuffleQuestions,
        showResults: !!e.showResults,
        isPublished: !!e.isPublished,
        accessToken: e.accessToken,
        createdAt: ms(e.createdAt) ?? Date.now(),
      });
      map[e.id] = id;
    }

    // 5b. patch courses.certExamId
    for (const c of d.courses) {
      if (c.certExamId) {
        await ctx.db.patch(map[c.id] as never, { certExamId: ref(c.certExamId) });
      }
    }

    // 6. questions
    for (const q of d.questions) {
      const id = await ctx.db.insert("questions", {
        examId: ref(q.examId),
        text: q.text,
        type: q.type ?? "MCQ",
        options: q.options ?? "[]",
        correct: q.correct,
        marks: q.marks ?? 1,
        order: q.order ?? 0,
      });
      map[q.id] = id;
    }

    // 7. exam attempts + answers
    for (const a of d.examAttempts) {
      const id = await ctx.db.insert("attempts", {
        examId: ref(a.examId),
        userId: ref(a.userId),
        startedAt: ms(a.startedAt) ?? Date.now(),
        finishedAt: ms(a.finishedAt),
        score: a.score ?? null,
        totalMarks: a.totalMarks ?? null,
        percentage: a.percentage ?? null,
        passed: a.passed ?? null,
        status: a.status ?? "IN_PROGRESS",
        violations: a.violations ?? "[]",
        violationCount: a.violationCount ?? 0,
        autoSubmitted: !!a.autoSubmitted,
      });
      map[a.id] = id;
    }
    for (const a of d.examAnswers) {
      const id = await ctx.db.insert("answers", {
        attemptId: ref(a.attemptId),
        questionId: ref(a.questionId),
        answer: a.answer ?? null,
        isCorrect: !!a.isCorrect,
      });
      map[a.id] = id;
    }

    // 8. lesson progress
    for (const p of d.lessonProgress) {
      const id = await ctx.db.insert("lessonProgress", {
        userId: ref(p.userId),
        lessonId: ref(p.lessonId),
        completedAt: ms(p.completedAt) ?? Date.now(),
      });
      map[p.id] = id;
    }

    // 9. enrollments
    for (const e of d.enrollments) {
      const id = await ctx.db.insert("enrollments", {
        userId: ref(e.userId),
        courseId: ref(e.courseId),
        createdAt: ms(e.createdAt) ?? Date.now(),
      });
      map[e.id] = id;
    }

    // 10. assignments + submissions
    for (const a of d.assignments) {
      const id = await ctx.db.insert("assignments", {
        title: a.title,
        description: a.description ?? "",
        courseId: ref(a.courseId),
        dueDate: ms(a.dueDate),
        maxScore: a.maxScore ?? 100,
        allowFile: a.allowFile !== false,
        allowText: a.allowText !== false,
        isPublished: a.isPublished !== false,
        createdAt: ms(a.createdAt) ?? Date.now(),
      });
      map[a.id] = id;
    }
    for (const s of d.assignmentSubmissions) {
      const id = await ctx.db.insert("submissions", {
        assignmentId: ref(s.assignmentId),
        userId: ref(s.userId),
        content: s.content ?? "",
        fileUrl: s.fileUrl ?? null,
        score: s.score ?? null,
        feedback: s.feedback ?? null,
        status: s.status ?? "SUBMITTED",
        submittedAt: ms(s.submittedAt) ?? Date.now(),
        gradedAt: ms(s.gradedAt),
      });
      map[s.id] = id;
    }

    // 11. certificates
    for (const c of d.certificates) {
      const id = await ctx.db.insert("certificates", {
        serial: c.serial,
        userId: ref(c.userId),
        courseId: c.courseId ? ref(c.courseId) : null,
        title: c.title,
        reason: c.reason ?? "",
        score: c.score ?? null,
        issuedAt: ms(c.issuedAt) ?? Date.now(),
      });
      map[c.id] = id;
    }

    // 12. community
    for (const p of d.posts) {
      const id = await ctx.db.insert("posts", {
        title: p.title,
        content: p.content,
        userId: ref(p.userId),
        createdAt: ms(p.createdAt) ?? Date.now(),
      });
      map[p.id] = id;
    }
    for (const c of d.comments) {
      const id = await ctx.db.insert("comments", {
        postId: ref(c.postId),
        userId: ref(c.userId),
        content: c.content,
        createdAt: ms(c.createdAt) ?? Date.now(),
      });
      map[c.id] = id;
    }

    // 13. dictionary
    for (const w of d.dictionaryWords) {
      const id = await ctx.db.insert("dictionaryWords", {
        arabic: w.arabic,
        english: w.english,
        description: w.description ?? "",
        createdAt: ms(w.createdAt) ?? Date.now(),
      });
      map[w.id] = id;
    }

    return { seeded: true, users: d.users.length + (d.extraUsers?.length ?? 0), idMapSize: Object.keys(map).length };
  },
});
