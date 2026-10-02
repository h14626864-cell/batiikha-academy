import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, convexError } from "@/lib/convex";
import { hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة مرور (6 أحرف على الأقل) مطلوبان" }, { status: 400 });
    }
    const normalized = String(email).toLowerCase().trim();
    // banned by admin → cannot register
    const blocked = await cxQuery<boolean>("users:isEmailBlocked", { email: normalized });
    if (blocked) {
      return NextResponse.json({ error: "هذا البريد محظور من قبل الإدارة" }, { status: 403 });
    }
    const existing = await cxQuery<unknown | null>("users:getByEmail", { email: normalized });
    if (existing) {
      return NextResponse.json({ error: "هذا البريد مسجل بالفعل، سجّل الدخول" }, { status: 400 });
    }
    const id = await cxMutation<string>("users:create", {
      email: normalized,
      name: name?.trim() || normalized.split("@")[0],
      passwordHash: hashPassword(String(password)),
      role: "STUDENT",
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
