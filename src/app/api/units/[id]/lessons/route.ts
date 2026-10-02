import { NextRequest, NextResponse } from "next/server";
import { cxMutation, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "عنوان الدرس مطلوب" }, { status: 400 });
    const type = ["VIDEO", "PDF", "TEXT", "IMAGE"].includes(body.type) ? body.type : "TEXT";
    if (type === "VIDEO" && !body.content?.trim()) {
      return NextResponse.json({ error: "رابط يوتيوب مطلوب لدرس الفيديو" }, { status: 400 });
    }
    if ((type === "PDF" || type === "IMAGE") && !body.content?.trim()) {
      return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
    }
    const lesson = await cxMutation("courses:createLesson", {
      unitId: id,
      title: body.title.trim(),
      type,
      content: body.content?.trim() || "",
    });
    return NextResponse.json(lesson);
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
