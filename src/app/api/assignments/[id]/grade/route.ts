import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const score = Number(body.score);
    if (Number.isNaN(score) || score < 0) return NextResponse.json({ error: "درجة غير صالحة" }, { status: 400 });

    const result = await cxMutation("assignments:grade", {
      submissionId: id,
      score,
      feedback: body.feedback?.trim() || null,
    });
    return NextResponse.json(serialize(result));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
