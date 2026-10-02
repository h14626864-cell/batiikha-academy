import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await params;
  try {
    const body = await req.json();
    if (!body.arabic?.trim() || !body.english?.trim()) {
      return NextResponse.json({ error: "الكلمة العربية والإنجليزية مطلوبتان" }, { status: 400 });
    }
    const word = await cxMutation("dictionary:update", {
      id,
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  const { id } = await params;
  try {
    await cxMutation("dictionary:remove", { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
