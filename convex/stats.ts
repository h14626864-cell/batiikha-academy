import { query } from "./_generated/server";
import { v } from "convex/values";
import { guard } from "./lib";

/** Public leaderboard — mirrors /api/leaderboard */
export const leaderboard = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const users = (await ctx.db.query("users").collect()) as unknown as Array<{
      _id: string;
      name?: string | null;
      email: string;
      image?: string | null;
      role: string;
    }>;
    const out: unknown[] = [];
    for (const u of users.filter((u) => u.role === "STUDENT")) {
      const progress = (await ctx.db
        .query("lessonProgress")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ _id: string }>;
      const attempts = (await ctx.db
        .query("attempts")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ status: string; percentage?: number | null }>;
      const finished = attempts.filter((a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED");
      const subs = (await ctx.db
        .query("submissions")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ status: string; score?: number | null; assignmentId: string }>;
      const graded: Array<{ score: number; maxScore: number }> = [];
      for (const s of subs.filter((s) => s.status === "GRADED" && s.score !== null && s.score !== undefined)) {
        const a = (await ctx.db.get(s.assignmentId as never)) as unknown as { maxScore: number } | null;
        graded.push({ score: s.score ?? 0, maxScore: a?.maxScore ?? 100 });
      }
      const certificates = (await ctx.db
        .query("certificates")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ _id: string }>;

      const lessonPoints = progress.length * 5;
      const bestExam = finished.reduce((m, a) => Math.max(m, a.percentage ?? 0), 0);
      const assignAvg =
        graded.length > 0
          ? graded.reduce((s, g) => s + Math.min(100, (g.score / (g.maxScore || 100)) * 100), 0) / graded.length
          : 0;
      const total = Math.round((lessonPoints + bestExam + assignAvg) * 10) / 10;

      out.push({
        id: u._id,
        name: u.name || u.email.split("@")[0],
        email: u.email,
        image: u.image ?? null,
        lessonPoints,
        bestExam,
        assignAvg: Math.round(assignAvg * 10) / 10,
        certificates: certificates.length,
        total,
      });
    }
    (out as Array<{ total: number }>).sort((a, b) => b.total - a.total);
    return out.slice(0, 10);
  },
});

/** Admin dashboard stats — mirrors /api/admin/stats */
export const adminStats = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const users = (await ctx.db.query("users").collect()) as unknown as Array<{ _id: string; role: string; name?: string | null; image?: string | null; hidden?: boolean }>;
    const courses = await ctx.db.query("courses").collect();
    const lessons = await ctx.db.query("lessons").collect();
    const exams = await ctx.db.query("exams").collect();
    const assignments = await ctx.db.query("assignments").collect();
    const attempts = (await ctx.db.query("attempts").collect()) as unknown as Array<{
      _id: string;
      userId: string;
      status: string;
      finishedAt?: number | null;
      percentage?: number | null;
    }>;
    const submissions = await ctx.db.query("submissions").collect();
    const certificates = await ctx.db.query("certificates").collect();
    const posts = await ctx.db.query("posts").collect();

    const finished = attempts.filter((a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED");
    finished.sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
    const recentAttempts: unknown[] = [];
    const examDocs = (await ctx.db.query("exams").collect()) as unknown as Array<{ _id: string; title: string }>;
    for (const a of finished.slice(0, 6)) {
      const u = (await ctx.db.get(a.userId as never)) as unknown as { name?: string | null; email: string } | null;
      const exam = examDocs.find((e) => e._id === (a as unknown as { examId: string }).examId);
      recentAttempts.push({
        ...stripDoc(a),
        user: u ? { name: u.name, email: u.email } : null,
        exam: exam ? { title: exam.title } : null,
      });
    }

    const ranked: unknown[] = [];
    for (const u of users.filter((u) => u.role === "STUDENT")) {
      const progress = (await ctx.db
        .query("lessonProgress")
        .withIndex("by_user", (q) => q.eq("userId", u._id as never))
        .collect()) as unknown as Array<{ _id: string }>;
      const mine = finished.filter((a) => a.userId === u._id);
      ranked.push({
        id: u._id,
        name: u.name ?? "طالب",
        image: u.image ?? null,
        points: progress.length * 5 + mine.reduce((m, a) => Math.max(m, a.percentage ?? 0), 0),
      });
    }
    (ranked as Array<{ points: number }>).sort((a, b) => b.points - a.points);

    return {
      stats: {
        students: users.filter((u) => u.role === "STUDENT").length,
        admins: users.filter((u) => u.role === "ADMIN" && !u.hidden).length,
        courses: courses.length,
        lessons: lessons.length,
        exams: exams.length,
        assignments: assignments.length,
        attempts: finished.length,
        submissions: submissions.length,
        certificates: certificates.length,
        posts: posts.length,
      },
      recentAttempts,
      topStudents: ranked.slice(0, 5),
    };
  },
});

/** Student dashboard — mirrors /api/student/dashboard */
export const studentDashboard = query({
  args: { secret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const enrollments = (await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as never))
      .collect()) as unknown as Array<{ _id: string; courseId: string; createdAt: number }>;

    const enrollmentsOut: unknown[] = [];
    const courseProgress: unknown[] = [];
    for (const e of enrollments) {
      const c = (await ctx.db.get(e.courseId as never)) as unknown as { _id: string; title: string; description: string; thumbnail?: string | null; isPublished: boolean; certRule: string; certExamId?: string | null; certTitle?: string | null; createdAt: number; updatedAt: number } | null;
      if (!c) continue;
      const units = (await ctx.db.query("units").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()) as unknown as Array<{ _id: string }>;
      let examCount = 0;
      for (const _u of units) void _u;
      const courseExams = (await ctx.db.query("exams").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()) as unknown as Array<{ _id: string }>;
      examCount = courseExams.length;
      const courseAssignments = (await ctx.db.query("assignments").withIndex("by_course", (q) => q.eq("courseId", c._id as never)).collect()) as unknown as Array<{ _id: string }>;

      enrollmentsOut.push({
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
        _count: { units: units.length, exams: examCount, assignments: courseAssignments.length },
        enrolledAt: e.createdAt,
      });

      let total = 0;
      let done = 0;
      for (const u of units) {
        const ls = (await ctx.db.query("lessons").withIndex("by_unit", (q) => q.eq("unitId", u._id as never)).collect()) as unknown as Array<{ _id: string }>;
        total += ls.length;
        for (const l of ls) {
          const p = (await ctx.db
            .query("lessonProgress")
            .withIndex("by_user_lesson", (q) => q.eq("userId", args.userId as never).eq("lessonId", l._id as never))
            .first()) as unknown as { _id: string } | null;
          if (p) done++;
        }
      }
      courseProgress.push({ courseId: c._id, total, done });
    }

    const attempts = (await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; examId: string; startedAt: number }>;
    attempts.sort((a, b) => b.startedAt - a.startedAt);
    const attemptsOut: unknown[] = [];
    for (const a of attempts.slice(0, 10)) {
      const ex = (await ctx.db.get(a.examId as never)) as unknown as { _id: string; title: string; courseId: string | null } | null;
      let course: { title: string } | null = null;
      if (ex && ex.courseId) {
        const c = (await ctx.db.get(ex.courseId as never)) as unknown as { title: string } | null;
        course = c ? { title: c.title } : null;
      }
      attemptsOut.push({ ...stripDoc(a), exam: ex ? { id: ex._id, title: ex.title, course } : null });
    }

    const subs = (await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; assignmentId: string; submittedAt: number }>;
    subs.sort((a, b) => b.submittedAt - a.submittedAt);
    const subsOut: unknown[] = [];
    for (const s of subs.slice(0, 10)) {
      const asg = (await ctx.db.get(s.assignmentId as never)) as unknown as { _id: string; title: string; maxScore: number; courseId: string } | null;
      let course: { title: string } | null = null;
      if (asg) {
        const c = (await ctx.db.get(asg.courseId as never)) as unknown as { title: string } | null;
        course = c ? { title: c.title } : null;
      }
      subsOut.push({
        ...stripDoc(s),
        assignment: asg ? { id: asg._id, title: asg.title, maxScore: asg.maxScore, course } : null,
      });
    }

    const certificates = (await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as never))
      .collect()) as unknown as Array<Record<string, unknown> & { _id: string; issuedAt: number }>;
    certificates.sort((a, b) => b.issuedAt - a.issuedAt);

    const allLessons = await ctx.db.query("lessons").collect();
    const doneAll = (await ctx.db
      .query("lessonProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as never))
      .collect()) as unknown as Array<{ _id: string }>;

    return {
      enrollments: enrollmentsOut,
      courseProgress,
      attempts: attemptsOut,
      submissions: subsOut,
      certificates: certificates.map(stripDoc),
      overall: { totalLessons: allLessons.length, doneLessons: doneAll.length },
    };
  },
});

function stripDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
