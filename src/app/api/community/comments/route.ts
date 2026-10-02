import { NextRequest, NextResponse } from "next/server";
import { cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.postId || !body.content?.trim()) return NextResponse.json({ error: "التعليق فارغ" }, { status: 400 });
    const comment = await cxMutation("community:createComment", {
      userId: user.id,
      postId: body.postId,
      content: body.content.trim(),
    });
    return NextResponse.json(serialize(comment));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
    await cxMutation("community:deleteComment", {
      id,
      requesterId: user.id,
      requesterIsAdmin: user.role === "ADMIN",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
