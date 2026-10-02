import { NextRequest, NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

/** Student enters an exam via its share link token: get exam state + (if attempting) sanitized questions. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  const { token } = await ctx.params;
  try {
    const result = await cxQuery("exams:publicState", { userId: user.id, token });
    return NextResponse.json(serialize(result));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
