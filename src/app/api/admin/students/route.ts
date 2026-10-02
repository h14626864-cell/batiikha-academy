import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

/** Admin: list all users with progress summary. */
export async function GET() {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const users = await cxQuery("users:listWithSummary");
    return NextResponse.json(serialize(users));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Admin: change user role. Body: { userId, role } */
export async function PATCH(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const { userId, role } = await req.json();
    if (!userId || !["ADMIN", "STUDENT"].includes(role)) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    if (userId === admin.id && role !== "ADMIN") {
      return NextResponse.json({ error: "لا يمكن إزالة صلاحيتك بنفسك" }, { status: 400 });
    }
    await cxMutation("users:updateRole", { userId, role });
    return NextResponse.json({ id: userId, role });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Admin: delete user. */
export async function DELETE(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
    if (id === admin.id) return NextResponse.json({ error: "لا يمكنك حذف حسابك" }, { status: 400 });
    await cxMutation("users:remove", { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
