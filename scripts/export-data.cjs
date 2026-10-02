// Export all Prisma tables to JSON for the Convex seed
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

(async () => {
  const db = new PrismaClient();
  const out = {};
  out.users = await db.user.findMany();
  out.courses = await db.course.findMany();
  out.units = await db.unit.findMany();
  out.lessons = await db.lesson.findMany();
  out.lessonProgress = await db.lessonProgress.findMany();
  out.enrollments = await db.enrollment.findMany();
  out.assignments = await db.assignment.findMany();
  out.assignmentSubmissions = await db.assignmentSubmission.findMany();
  out.exams = await db.exam.findMany();
  out.questions = await db.question.findMany();
  out.examAttempts = await db.examAttempt.findMany();
  out.examAnswers = await db.examAnswer.findMany();
  out.certificates = await db.certificate.findMany();
  out.posts = await db.post.findMany();
  out.comments = await db.comment.findMany();
  out.dictionaryWords = await db.dictionaryWord.findMany();
  const dir = path.join(__dirname, "migration-data");
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries(out)) {
    fs.writeFileSync(path.join(dir, k + ".json"), JSON.stringify(v, null, 1));
    console.log(k, v.length);
  }
  await db.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
