import { NextRequest, NextResponse } from "next/server";
import { cxMutation, convexError } from "@/lib/convex";

/** Public: a banned/blocked user submits an appeal (طلب طعن) — no login required. */
export async function POST(req: NextRequest) {
  try {
    const { email, message } = await req.json();
    if (!email || typeof email !== "string" || !message || typeof message !== "string") {
      return NextResponse.json({ error: "البريد ونص الطعن مطلوبان" }, { status: 400 });
    }
    await cxMutation("moderation:submitAppeal", {
      email: String(email).toLowerCase().trim(),
      message: String(message),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
