import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const words = await cxQuery("dictionary:search", { q });
    return NextResponse.json(serialize(words));
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
    if (!body.arabic?.trim() || !body.english?.trim()) {
      return NextResponse.json({ error: "الكلمة العربية والإنجليزية مطلوبتان" }, { status: 400 });
    }
    const word = await cxMutation("dictionary:create", {
      arabic: body.arabic.trim(),
      english: body.english.trim(),
      description: body.description?.trim() || "",
    });
    return NextResponse.json(serialize(word));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
