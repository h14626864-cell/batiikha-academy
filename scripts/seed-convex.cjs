// Merge local export + live-only users into the seed payload, then call migrate:seedAll
const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");

const DIR = path.join(__dirname, "migration-data");
const SECRET = fs.readFileSync(path.join(__dirname, ".convex_secret"), "utf8").trim();
const URL = "https://peaceful-porpoise-555.convex.cloud";

const read = (name) => JSON.parse(fs.readFileSync(path.join(DIR, name + ".json"), "utf8"));

(async () => {
  const data = {
    users: read("users"),
    courses: read("courses"),
    units: read("units"),
    lessons: read("lessons"),
    lessonProgress: read("lessonProgress"),
    enrollments: read("enrollments"),
    assignments: read("assignments"),
    assignmentSubmissions: read("assignmentSubmissions"),
    exams: read("exams"),
    questions: read("questions"),
    examAttempts: read("examAttempts"),
    examAnswers: read("examAnswers"),
    certificates: read("certificates"),
    posts: read("posts"),
    comments: read("comments"),
    dictionaryWords: read("dictionaryWords"),
    extraUsers: [],
  };

  // Users registered on the live /tmp instance after deploy — recover them.
  const known = new Set(data.users.map((u) => u.email));
  const liveUsers = JSON.parse(fs.readFileSync(path.join(DIR, "live", "users.json"), "utf8"));
  for (const u of liveUsers) {
    if (!known.has(u.email)) {
      data.extraUsers.push({
        id: u.id,
        email: u.email,
        name: u.name ?? null,
        image: u.image ?? null,
        passwordHash: null, // not retrievable via API; Google login still works for gmail accounts
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.createdAt,
      });
    }
  }

  const client = new ConvexHttpClient(URL);
  const res = await client.mutation("migrate:seedAll", { secret: SECRET, data });
  console.log("SEED RESULT:", JSON.stringify(res));
  process.exit(0);
})().catch((e) => {
  console.error("SEED FAILED:", e.message || e);
  process.exit(1);
});
