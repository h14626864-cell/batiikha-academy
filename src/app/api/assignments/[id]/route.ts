import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["title", "description"]) if (body[k] !== undefined) patch[k] = body[k];
    if (body.dueDate !== undefined) patch.dueDate = body.dueDate ? new Date(body.dueDate).getTime() : null;
    if (body.maxScore !== undefined) patch.maxScore = Number(body.maxScore) || 100;
    if (body.isPublished !== undefined) patch.isPublished = !!body.isPublished;
    const assignment = await cxMutation("assignments:update", { id, patch });
    return NextResponse.json(serialize(assignment));
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
    await cxMutation("assignments:remove", { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
