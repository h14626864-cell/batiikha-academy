import { NextRequest, NextResponse } from "next/server";
import { cxMutation, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  const { id } = await ctx.params;
  try {
    const { type } = await req.json();
    const result = await cxMutation("exams:recordViolation", {
      userId: user.id,
      attemptId: id,
      type: String(type || "UNKNOWN"),
    });
    return NextResponse.json(result);
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
