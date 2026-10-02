import { NextRequest, NextResponse } from "next/server";
import { cxMutation, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "عنوان الوحدة مطلوب" }, { status: 400 });
    const unit = await cxMutation("courses:createUnit", { courseId: id, title: body.title.trim() });
    return NextResponse.json(unit);
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
