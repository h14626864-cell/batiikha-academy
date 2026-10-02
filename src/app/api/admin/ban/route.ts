import { NextRequest, NextResponse } from "next/server";
import { cxMutation, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

async function onlyAdmin() {
  const user = await getSessionUser();
  return user && user.role === "ADMIN" ? user : null;
}

/** Admin: ban a user. Body: { userId, reason?, days? } — days omitted = permanent */
export async function POST(req: NextRequest) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const { userId, reason, days } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId مطلوب" }, { status: 400 });
    const daysNum = days ? Number(days) : 0;
    if (Number.isNaN(daysNum) || daysNum < 0) {
      return NextResponse.json({ error: "مدة الحظر غير صالحة" }, { status: 400 });
    }
    await cxMutation("moderation:ban", {
      userId,
      reason: typeof reason === "string" ? reason : undefined,
      days: daysNum > 0 ? daysNum : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Admin: lift a ban (?userId=...) */
export async function DELETE(req: NextRequest) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId مطلوب" }, { status: 400 });
    await cxMutation("moderation:unban", { userId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
