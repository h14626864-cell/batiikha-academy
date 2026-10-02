import { NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";

/**
 * Leaderboard: top students by total points.
 * Points = 5 per completed lesson + best exam percentage + assignment graded percentage.
 */
export async function GET() {
  try {
    const ranked = await cxQuery("stats:leaderboard");
    return NextResponse.json(serialize(ranked));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
