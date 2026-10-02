import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId") || undefined;
    const assignments = await cxQuery("assignments:list", {
      viewerIsAdmin: user.role === "ADMIN",
      userId: user.id,
      courseId,
    });
    return NextResponse.json(serialize(assignments));
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
    if (!body.title?.trim() || !body.courseId) {
      return NextResponse.json({ error: "العنوان والكورس مطلوبان" }, { status: 400 });
    }
    const id = await cxMutation<string>("assignments:create", {
      title: body.title.trim(),
      description: body.description?.trim() || "",
      courseId: body.courseId,
      dueDate: body.dueDate ? new Date(body.dueDate).getTime() : null,
      maxScore: Number(body.maxScore) || 100,
      allowFile: body.allowFile !== false,
      allowText: body.allowText !== false,
      isPublished: body.isPublished !== false,
    });
    const assignment = await cxQuery("assignments:list", { viewerIsAdmin: true, userId: user.id, courseId: body.courseId });
    const created = (assignment as Array<Record<string, unknown>>).find((a) => a.id === id) ?? { id };
    return NextResponse.json(serialize(created));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
