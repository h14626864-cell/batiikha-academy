import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const WORDS = [
  { arabic: "ماء", english: "water", description: "السائل الشفاف الذي نشربه — مثال: I drink water every day." },
  { arabic: "كتاب", english: "book", description: "مجموعة صفحات مطبوعة للقراءة — مثال: This book is very useful." },
  { arabic: "مدرسة", english: "school", description: "المكان الذي نتعلم فيه — مثال: I go to school by bus." },
  { arabic: "صديق", english: "friend", description: "الشخص الذي تحبه وتثق فيه — مثال: My friend helps me study." },
  { arabic: "حاسوب", english: "computer", description: "جهاز إلكتروني للعمل والتعلم — مثال: I use a computer to code." },
  { arabic: "شكرًا", english: "thank you", description: "كلمة تُقال تقديرًا لمعروف — مثال: Thank you for your help!" },
];

async function main() {
  for (const w of WORDS) {
    const exists = await db.dictionaryWord.findFirst({ where: { english: w.english, arabic: w.arabic } });
    if (!exists) await db.dictionaryWord.create({ data: w });
  }
  console.log(`Dictionary seeded: ${await db.dictionaryWord.count()} words`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
