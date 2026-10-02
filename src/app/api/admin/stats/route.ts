import { NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function GET() {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const data = await cxQuery("stats:adminStats");
    return NextResponse.json(serialize(data));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
