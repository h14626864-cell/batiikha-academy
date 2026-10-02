import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

async function onlyAdmin() {
  const user = await getSessionUser();
  return user && user.role === "ADMIN" ? user : null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const exam = await cxQuery("exams:adminDetail", { id });
    if (!exam) return NextResponse.json({ error: "الامتحان غير موجود" }, { status: 404 });
    return NextResponse.json(serialize(exam));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    for (const k of ["title", "description"]) if (body[k] !== undefined) patch[k] = body[k];
    if (body.durationMin !== undefined) patch.durationMin = Number(body.durationMin) || 30;
    if (body.openAt !== undefined) patch.openAt = body.openAt ? new Date(body.openAt).getTime() : null;
    if (body.closeAt !== undefined) patch.closeAt = body.closeAt ? new Date(body.closeAt).getTime() : null;
    if (body.passScore !== undefined) patch.passScore = Number(body.passScore) || 50;
    if (body.maxViolations !== undefined) patch.maxViolations = Number(body.maxViolations);
    if (body.shuffleQuestions !== undefined) patch.shuffleQuestions = !!body.shuffleQuestions;
    if (body.showResults !== undefined) patch.showResults = !!body.showResults;
    if (body.isPublished !== undefined) patch.isPublished = !!body.isPublished;

    const exam = await cxMutation("exams:update", {
      id,
      patch,
      refreshToken: !!body.refreshToken,
      questions: Array.isArray(body.questions)
        ? body.questions.map((q: { text?: string; type?: string; options?: string[]; correct: string; marks?: number }) => ({
            text: q.text ?? "",
            type: q.type,
            options: q.options,
            correct: q.correct,
            marks: q.marks,
          }))
        : undefined,
    });
    return NextResponse.json(serialize(exam));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    await cxMutation("exams:remove", { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
