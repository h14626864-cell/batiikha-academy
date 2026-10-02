import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // ---- Admin account ----
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@manara.academy").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "Admin@12345";
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "مدير المنصة",
      passwordHash: hashPassword(adminPass),
      role: "ADMIN",
    },
  });
  console.log("✓ Admin ready:", adminEmail);

  // ---- Demo course ----
  let course = await db.course.findFirst({ where: { title: "أساسيات البرمجة بلغة Python" } });
  if (!course) {
    course = await db.course.create({
      data: {
        title: "أساسيات البرمجة بلغة Python",
        description: "كورس تمهيدي شامل لتعلم البرمجة بلغة بايثون من الصفر: المتغيرات، الشروط، الحلقات، والدوال مع تطبيقات عملية.",
        isPublished: true,
        certRule: "ALL_LESSONS",
        certTitle: "أساسيات البرمجة بلغة Python",
      },
    });
    console.log("✓ Demo course created");

    const u1 = await db.unit.create({ data: { title: "الوحدة الأولى: البداية مع بايثون", courseId: course.id, order: 0 } });
    const u2 = await db.unit.create({ data: { title: "الوحدة الثانية: التحكم في سير البرنامج", courseId: course.id, order: 1 } });

    await db.lesson.createMany({
      data: [
        { title: "ما هي البرمجة ولماذا بايثون؟", type: "TEXT", content: "البرمجة هي فن تحويل الأفكار إلى تعليمات يفهمها الحاسوب.\n\nلماذا بايثون؟\n1. لغة سهلة وقريبة من اللغة الإنسانية\n2. مجتمع ضخم ومكتبات لا نهائية\n3. تُستخدم في الويب، الذكاء الاصطناعي، تحليل البيانات، والأتمتة\n\nفي هذا الكورس سنتعلم خطوة بخطوة مع أمثلة عملية بعد كل درس.", unitId: u1.id, order: 0 },
        { title: "تنصيب بايثون وأول برنامج", type: "VIDEO", content: "https://www.youtube.com/watch?v=rfscVS0vtbw", unitId: u1.id, order: 1 },
        { title: "المتغيرات وأنواع البيانات", type: "TEXT", content: "المتغير = وعاء نخزن فيه بيانات.\n\nx = 5          # عدد صحيح (int)\nname = \"أحمد\"  # نص (str)\npi = 3.14      # عدد عشري (float)\nok = True      # منطقي (bool)\n\nجرّب بنفسك: أنشئ متغيرًا لاسمك وآخر لعمرك ثم اطبعهما بطباعة print().", unitId: u1.id, order: 2 },
        { title: "جملة if والشروط", type: "VIDEO", content: "https://www.youtube.com/watch?v=DZwmv8Ijgl0", unitId: u2.id, order: 0 },
        { title: "مراجعة الوحدة الثانية", type: "TEXT", content: "مراجعة سريعة:\n- if: نفّذ الكود إذا تحقق الشرط\n- elif: شرط بديل\n- else: في كل الحالات الأخرى\n\nالمقارنات: ==  !=  >  <  >=  <=\nالمنطق: and / or / not", unitId: u2.id, order: 1 },
      ],
    });
  }

  // ---- Demo exam ----
  let exam = await db.exam.findFirst({ where: { title: "امتحان الوحدة الأولى" } });
  if (!exam) {
    const opened = new Date(Date.now() - 60 * 60 * 1000);
    const closes = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    exam = await db.exam.create({
      data: {
        title: "امتحان الوحدة الأولى",
        description: "امتحان قصير للتحقق من فهمك للوحدة الأولى. بالتوفيق!",
        courseId: course.id,
        durationMin: 15,
        openAt: opened,
        closeAt: closes,
        passScore: 50,
        maxViolations: 3,
        isPublished: true,
        accessToken: "demo-exam-link-2026",
        questions: {
          create: [
            { text: "ما هي الدالة المستخدمة لطباعة النصوص في بايثون؟", type: "MCQ", options: JSON.stringify(["print()", "echo()", "log()", "show()"]), correct: "print()", marks: 1, order: 0 },
            { text: "بايثون لغة يصعب تعلمها للمبتدئين", type: "TRUE_FALSE", options: JSON.stringify(["صح", "خطأ"]), correct: "خطأ", marks: 1, order: 1 },
            { text: "أي من التالي نوع بيانات منطقي (Boolean) في بايثون؟", type: "MCQ", options: JSON.stringify(["True", "1", "نعم", "yes"]), correct: "True", marks: 1, order: 2 },
            { text: "كيف نكتب تعليق (Comment) في بايثون؟", type: "MCQ", options: JSON.stringify(["// تعليق", "# تعليق", "/* تعليق */", "<!-- تعليق -->"]), correct: "# تعليق", marks: 1, order: 3 },
          ],
        },
      },
    });
    console.log("✓ Demo exam created (token: demo-exam-link-2026)");
  }

  // ---- Demo assignment ----
  const assignment = await db.assignment.findFirst({ where: { title: "واجب: برنامج الآلة الحاسبة البسيطة" } });
  if (!assignment) {
    await db.assignment.create({
      data: {
        title: "واجب: برنامج الآلة الحاسبة البسيطة",
        description: "اكتب برنامج بايثون بسيط يأخذ رقمين من المستخدم ويطبع مجموعهما وفارقهما. اشرح الكود بالتعليقات، ثم سلّم الحل كنص أو صورة.",
        courseId: course.id,
        maxScore: 10,
        allowText: true,
        allowFile: true,
        isPublished: true,
      },
    });
    console.log("✓ Demo assignment created");
  }

  console.log("\n🎉 Seed complete!");
  console.log("   Admin login:", adminEmail, "/", adminPass);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
