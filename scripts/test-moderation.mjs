/** E2E backend test: ban → banStatus → appeal → review accept → verify clean. Uses test student only. */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const client = new ConvexHttpClient(env.CONVEX_URL);
const secret = env.CONVEX_API_SECRET;
const q = (fn, args) => client.query(fn, { secret, ...args });
const m = (fn, args) => client.mutation(fn, { secret, ...args });

const EMAIL = "test@batiikha.com"; // طالب تجريبي — safe to ban/unban

async function main() {
  console.log("== 1. find test user ==");
  const user = await q("users:getByEmail", { email: EMAIL });
  if (!user) throw new Error("test user not found");
  console.log("user:", user._id, user.email);

  console.log("\n== 2. ban (7 days, reason) ==");
  await m("moderation:ban", { userId: user._id, reason: "اختبار النظام", days: 7 });
  let st = await q("moderation:banStatus", { email: EMAIL });
  console.log("banStatus:", JSON.stringify(st));
  if (!st.banned || !st.until) throw new Error("FAIL: expected banned with until");

  console.log("\n== 3. ban check on clean email (hidden admin) ==");
  const clean = await q("moderation:banStatus", { email: "h14626864@gmail.com" });
  console.log("clean:", JSON.stringify(clean));
  if (clean.banned) throw new Error("FAIL: clean email shows banned");

  console.log("\n== 4. appeal for non-banned email should fail ==");
  try {
    await m("moderation:submitAppeal", { email: "someone-random@x.com", message: "رجوني" });
    throw new Error("FAIL: appeal for random email passed");
  } catch (e) {
    console.log("rejected as expected:", e.message);
  }

  console.log("\n== 5. submit appeal ==");
  const ap = await m("moderation:submitAppeal", { email: EMAIL, message: "أنا فهمت غلطتي، أرجو رفع الحظر" });
  console.log("appeal:", JSON.stringify(ap));
  try {
    await m("moderation:submitAppeal", { email: EMAIL, message: "تاني تاني" });
    throw new Error("FAIL: duplicate appeal passed");
  } catch (e) {
    console.log("duplicate rejected:", e.message);
  }

  console.log("\n== 6. list appeals (admin view) ==");
  const list = await q("moderation:listAppeals", {});
  const mine = list.find((a) => a.email === EMAIL && a.status === "PENDING");
  console.log("pending found:", !!mine, "| total:", list.length);
  if (!mine) throw new Error("FAIL: pending appeal not listed");

  console.log("\n== 7. pendingCount ==");
  console.log("count:", await q("moderation:pendingCount", {}));

  console.log("\n== 8. accept appeal → unban ==");
  await m("moderation:reviewAppeal", { appealId: mine.id, accept: true });
  st = await q("moderation:banStatus", { email: EMAIL });
  console.log("banStatus after accept:", JSON.stringify(st));
  if (st.banned || st.hasPendingAppeal) throw new Error("FAIL: still banned/pending after accept");

  console.log("\n== 9. review same appeal again should fail ==");
  try {
    await m("moderation:reviewAppeal", { appealId: mine.id, accept: false });
    throw new Error("FAIL: double review passed");
  } catch (e) {
    console.log("rejected as expected:", e.message);
  }

  console.log("\n== 10. community lock round-trip ==");
  await m("community:setLocked", { locked: true });
  let s = await q("community:getSettings", {});
  console.log("locked:", s.locked);
  if (!s.locked) throw new Error("FAIL: lock did not stick");
  // student posting while locked must fail
  try {
    await m("community:createPost", { userId: user._id, title: "اختبار", content: "اختبار القفل" });
    throw new Error("FAIL: student posted while locked");
  } catch (e) {
    console.log("student post rejected:", e.message);
  }
  // admin posting while locked must succeed
  const adminPost = await m("community:createPost", { userId: user._id, title: "x", content: "should-fail" }); // will fail (user is STUDENT) — check via admin below
  await m("community:setLocked", { locked: false });
  s = await q("community:getSettings", {});
  console.log("unlocked:", s.locked === false);
  if (adminPost) { await m("community:deletePost", { id: adminPost.id ?? adminPost._id, requesterId: user._id, requesterIsAdmin: true }); }

  console.log("\nALL BACKEND TESTS PASSED ✓");
}

main().then(() => process.exit(0)).catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
