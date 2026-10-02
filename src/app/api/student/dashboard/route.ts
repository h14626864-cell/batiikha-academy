import { NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";
import { requireUser, isNextResponse } from "@/lib/api-helpers";

/** Student's own dashboard data: enrolled courses + progress, exam attempts, submissions, certificates. */
export async function GET() {
  const user = await requireUser();
  if (isNextResponse(user)) return user;
  try {
    const data = await cxQuery("stats:studentDashboard", { userId: user.id });
    return NextResponse.json(serialize(data));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
