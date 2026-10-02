import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  try {
    const { lessonId } = await req.json();
    if (!lessonId) return NextResponse.json({ error: "lessonId مطلوب" }, { status: 400 });

    const lesson = await cxQuery<{ courseId: string | null } | null>("courses:lessonWithContext", { id: lessonId });
    if (!lesson) return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });

    const res = await cxMutation<{ ok: boolean; certificateIssued: boolean }>("progress:completeLesson", {
      userId: user.id,
      lessonId,
    });
    return NextResponse.json({ ok: true, certificateIssued: res.certificateIssued });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
