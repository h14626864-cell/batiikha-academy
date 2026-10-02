import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

/** Submit & auto-grade an attempt. Body: { answers: {questionId: optionText}, auto?: boolean } */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  const { id } = await ctx.params;
  try {
    const { answers, auto } = await req.json();
    const result = await cxMutation("exams:submitAttempt", {
      userId: user.id,
      attemptId: id,
      answers: answers ?? {},
      auto: !!auto,
    });
    return NextResponse.json(serialize(result));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
