import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { cxQuery, cxMutation } from "@/lib/convex";
import { verifyPassword } from "@/lib/password";

type DbUser = {
  _id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  passwordHash?: string | null;
  role: string;
  banned?: boolean;
  banUntil?: number;
};

/**
 * Platform owner accounts — these emails ALWAYS enter as ADMIN when signing in
 * with Google (any previous ban/block on them is lifted automatically, and an
 * existing session is promoted live without needing to sign in again).
 */
export const PLATFORM_ADMIN_EMAILS = new Set(["mohamed.aln3nashy@gmail.com"]);

/** A ban whose deadline passed is treated as lifted. */
function banActive(u: { banned?: boolean; banUntil?: number }): boolean {
  if (!u.banned) return false;
  if (u.banUntil && u.banUntil <= Date.now()) return false;
  return true;
}

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: string };
  }
  interface User {
    role?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "البريد الإلكتروني",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const isOwner = PLATFORM_ADMIN_EMAILS.has(email);
        // banned emails can never sign in (platform owners excepted)
        if (!isOwner) {
          const blocked = await cxQuery<boolean>("users:isEmailBlocked", { email });
          if (blocked) return null;
        }
        const user = await cxQuery<DbUser | null>("users:getByEmail", { email });
        if (!user?.passwordHash) return null;
        const ok = await verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
        // banned users cannot sign in (the login screen shows the appeal form)
        if (!isOwner && banActive(user)) return null;
        return { id: user._id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = (user as { role?: string }).role;
        if (role) {
          // credentials sign-in: user.id is already the platform (Convex) id
          token.id = user.id;
          token.role = role;
        } else if (token.email) {
          // OAuth sign-in: resolve the platform user by email, create if new.
          // Blocked (previously deleted) emails are refused here — findOrCreateOAuth throws.
          const email = token.email.toLowerCase().trim();
          // Platform owners: always enter as ADMIN (created/promoted on the spot,
          // any ban or email block is lifted automatically)
          if (PLATFORM_ADMIN_EMAILS.has(email)) {
            const owner = await cxMutation<{ id: string; role: string }>("users:ensureAdminOAuth", {
              email,
              name: user.name ?? null,
              image: user.image ?? null,
            });
            token.id = owner.id;
            token.role = owner.role;
            return token;
          }
          const blocked = await cxQuery<boolean>("users:isEmailBlocked", { email });
          if (blocked) {
            throw new Error("محظور");
          }
          const dbUser = await cxQuery<DbUser | null>("users:getByEmail", { email });
          if (dbUser) {
            if (banActive(dbUser)) {
              throw new Error("حسابك محظور من قبل الإدارة — يمكنك إرسال طلب طعن من صفحة الدخول");
            }
            token.id = dbUser._id;
            token.role = dbUser.role;
          } else {
            const newId = await cxMutation<string>("users:findOrCreateOAuth", {
              email,
              name: user.name ?? null,
              image: user.image ?? null,
            });
            token.id = newId;
            token.role = "STUDENT";
          }
        }
      }
      // Platform owners: promote even a live session (e.g. the owner list was
      // updated after they signed in) — runs once until the role sticks.
      const tEmail = typeof token.email === "string" ? token.email.toLowerCase().trim() : "";
      if (tEmail && PLATFORM_ADMIN_EMAILS.has(tEmail) && token.role !== "ADMIN") {
        const owner = await cxMutation<{ id: string; role: string }>("users:ensureAdminOAuth", {
          email: tEmail,
        });
        token.id = owner.id;
        token.role = owner.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "STUDENT";
      }
      return session;
    },
  },
  pages: { signIn: "/" },
};
