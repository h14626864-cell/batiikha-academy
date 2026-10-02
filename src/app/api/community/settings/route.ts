import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

/** Any signed-in user: community lock state (students show the closed banner). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  try {
    const settings = await cxQuery<{ locked: boolean }>("community:getSettings", {});
    return NextResponse.json(settings);
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Admin: lock/unlock the community chat for everyone. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  }
  try {
    const { locked } = await req.json();
    if (typeof locked !== "boolean") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    await cxMutation("community:setLocked", { locked });
    return NextResponse.json({ ok: true, locked });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
