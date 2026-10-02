import { NextRequest, NextResponse } from "next/server";
import { cxMutation, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

async function onlyAdmin() {
  const user = await getSessionUser();
  return user && user.role === "ADMIN" ? user : null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const unit = await cxMutation("courses:updateUnit", { id, title: body.title?.trim() });
    return NextResponse.json(unit);
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    await cxMutation("courses:deleteUnit", { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
