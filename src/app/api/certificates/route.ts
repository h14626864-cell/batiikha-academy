import { NextRequest, NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const certs = await cxQuery("certificates:listForUser", {
      userId: user.role === "ADMIN" && userId ? userId : user.id,
    });
    return NextResponse.json(serialize(certs));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
