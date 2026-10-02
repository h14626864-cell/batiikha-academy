import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  try {
    const exams = await cxQuery("exams:list", {
      viewerIsAdmin: user.role === "ADMIN",
      userId: user.id,
    });
    return NextResponse.json(serialize(exams));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "عنوان الامتحان مطلوب" }, { status: 400 });
    }
    const id = await cxMutation<string>("exams:create", {
      title: body.title.trim(),
      description: body.description?.trim() || "",
      courseId: body.courseId || undefined, // undefined → Convex stores null (standalone)
      durationMin: Number(body.durationMin) || 30,
      openAt: body.openAt ? new Date(body.openAt).getTime() : null,
      closeAt: body.closeAt ? new Date(body.closeAt).getTime() : null,
      passScore: Number(body.passScore) || 50,
      maxViolations: Number(body.maxViolations) ?? 3,
      shuffleQuestions: body.shuffleQuestions !== false,
      showResults: body.showResults !== false,
      isPublished: !!body.isPublished,
    });

    // save initial questions immediately (the editor sends them on create too)
    if (Array.isArray(body.questions) && body.questions.length > 0) {
      await cxMutation("exams:update", {
        id,
        patch: {},
        questions: body.questions.map((q: { text?: string; type?: string; options?: string[]; correct: string; marks?: number }) => ({
          text: q.text ?? "",
          type: q.type,
          options: q.options,
          correct: q.correct,
          marks: q.marks,
        })),
      });
    }
    const exam = await cxQuery("exams:adminDetail", { id });
    return NextResponse.json(serialize(exam));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
