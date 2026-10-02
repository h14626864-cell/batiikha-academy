/**
 * Seed: platform owner account — mohamed.aln3nashy@gmail.com
 * - role ADMIN (visible, like the main admin) + backup password
 * - lifts any ban + removes the email from blockedEmails if present
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

const EMAIL = "mohamed.aln3nashy@gmail.com";
const PASSWORD = "Mohamed@12345";
const NAME = "محمد النشائي";

async function call(fn, args) {
  return client.mutation(fn, { secret, ...args });
}

async function main() {
  // never blocked
  const blocked = await client.query("users:isEmailBlocked", { secret, email: EMAIL });
  if (blocked) {
    await call("users:unblockEmail", { email: EMAIL });
    console.log("Removed email from blockedEmails");
  }

  const existing = await client.query("users:getByEmail", { secret, email: EMAIL });
  if (existing) {
    console.log("Found existing user:", existing._id, "| role:", existing.role, "| banned:", existing.banned ?? false);
    await call("users:updateRole", { userId: existing._id, role: "ADMIN" });
    await call("users:setHidden", { userId: existing._id, hidden: false });
    await call("users:setPassword", { userId: existing._id, passwordHash: hashPassword(PASSWORD) });
    if (existing.banned) await call("moderation:unban", { userId: existing._id });
    console.log("Updated → ADMIN (visible) + password set + ban lifted");
  } else {
    const id = await call("users:create", {
      email: EMAIL,
      name: NAME,
      role: "ADMIN",
      hidden: false,
    });
    await call("users:setPassword", { userId: id, passwordHash: hashPassword(PASSWORD) });
    console.log("Created platform owner:", id);
  }

  // verify
  const check = await client.query("users:getByEmail", { secret, email: EMAIL });
  const all = await client.query("users:listWithSummary", { secret });
  console.log("Verify → role:", check.role, "| hasPassword:", !!check.passwordHash, "| banned:", check.banned ?? false);
  console.log("Visible in admin users list?", all.some((u) => u.email === EMAIL) ? "YES" : "NO");
  console.log("Done. Login: Google (auto-ADMIN) or password:", EMAIL, "/", PASSWORD);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
