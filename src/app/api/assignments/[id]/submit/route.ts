import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const submission = await cxMutation("assignments:submit", {
      userId: user.id,
      assignmentId: id,
      content: body.content ?? "",
      fileUrl: body.fileUrl || null,
    });
    return NextResponse.json(serialize(submission));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
