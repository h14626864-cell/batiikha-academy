import { NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

/** Public list of published courses (students). Admins also see it. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });

  try {
    const courses = await cxQuery("courses:listPublished");
    return NextResponse.json(serialize(courses));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
