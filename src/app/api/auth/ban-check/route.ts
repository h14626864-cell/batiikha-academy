import { NextRequest, NextResponse } from "next/server";
import { cxQuery, serialize, convexError } from "@/lib/convex";

/** Public: does this email have an active ban/block? (drives the login appeal screen) */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    }
    const status = await cxQuery("moderation:banStatus", {
      email: String(email).toLowerCase().trim(),
    });
    return NextResponse.json(serialize(status));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
