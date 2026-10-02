import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });

  try {
    const course = await cxQuery<Record<string, unknown> | null>("courses:getFull", {
      id,
      viewerIsAdmin: user.role === "ADMIN",
      userId: user.role === "ADMIN" ? undefined : user.id,
    });
    if (!course) return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });

    const isPublished = course.isPublished === true;
    if (user.role !== "ADMIN" && !isPublished) {
      return NextResponse.json({ error: "الكورس غير منشور" }, { status: 403 });
    }

    return NextResponse.json(serialize(course));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of ["title", "description", "thumbnail", "certRule", "certTitle"]) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (body.isPublished !== undefined) patch.isPublished = !!body.isPublished;
    if (body.certExamId !== undefined) patch.certExamId = body.certExamId || null;
    const course = await cxMutation("courses:update", { id, patch });
    return NextResponse.json(serialize(course));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    await cxMutation("courses:remove", { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
