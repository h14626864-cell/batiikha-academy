import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { requireAdmin, isNextResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isNextResponse(admin)) return admin;
  try {
    const courses = await cxQuery("courses:listAdmin");
    return NextResponse.json(serialize(courses));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isNextResponse(admin)) return admin;
  try {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "عنوان الكورس مطلوب" }, { status: 400 });
    const course = await cxMutation("courses:create", {
      title: body.title.trim(),
      description: body.description?.trim() || "",
      thumbnail: body.thumbnail || null,
      certRule: body.certRule || "NONE",
      certExamId: body.certExamId || null,
      certTitle: body.certTitle || null,
      isPublished: !!body.isPublished,
    });
    return NextResponse.json(serialize(course));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
