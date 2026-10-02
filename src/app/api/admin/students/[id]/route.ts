import { NextRequest, NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

/** Admin: full progress detail for one student. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const data = await cxQuery("users:detailForAdmin", { id });
    if (!data) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    return NextResponse.json(serialize(data));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
