import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

async function onlyAdmin() {
  const user = await getSessionUser();
  return user && user.role === "ADMIN" ? user : null;
}

/** GET — list all blocked emails */
export async function GET() {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const rows = await cxQuery("users:listBlocked", {});
    return NextResponse.json(serialize(rows));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** DELETE — unblock an email (?email=...) so the person can sign up again */
export async function DELETE(req: NextRequest) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "البريد مطلوب" }, { status: 400 });
    await cxMutation("users:unblockEmail", { email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
