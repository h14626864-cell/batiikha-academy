import { NextRequest, NextResponse } from "next/server";
import { cxMutation, cxQuery, serialize, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  try {
    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: "courseId مطلوب" }, { status: 400 });
    const enrollment = await cxMutation<{ id: string }>("progress:enroll", { userId: user.id, courseId });
    return NextResponse.json(enrollment);
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function GET() {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  try {
    const courseIds = await cxQuery<string[]>("progress:listUserEnrollments", { userId: user.id });
    return NextResponse.json(serialize(courseIds));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
