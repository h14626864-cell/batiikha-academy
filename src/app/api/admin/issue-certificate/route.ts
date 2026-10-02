import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

/** Admin manually issues a certificate. Body: { userId, title, reason?, score? } */
export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const { userId, title, reason, score } = await req.json();
    if (!userId || !title?.trim()) return NextResponse.json({ error: "الطالب واسم الشهادة مطلوبان" }, { status: 400 });

    const cert = await cxMutation("certificates:issueManual", {
      userId,
      title: title.trim(),
      reason: reason?.trim() || "شهادة تقدير من إدارة المنصة",
      score: score ? Number(score) : null,
    });
    return NextResponse.json(serialize(cert));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
    await cxMutation("certificates:remove", { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
