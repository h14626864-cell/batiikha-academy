import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

/** Start (or resume) an exam attempt. Body: { token } (from share link). */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "token مطلوب" }, { status: 400 });

    const result = await cxMutation("exams:startAttempt", { userId: user.id, token });
    return NextResponse.json(serialize(result));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
