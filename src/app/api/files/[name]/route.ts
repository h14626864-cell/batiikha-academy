import { NextRequest, NextResponse } from "next/server";
import { cxQuery } from "@/lib/convex";

/** Convex document ids are 32-char lowercase alphanumeric. */
const ID_RE = /^[a-z0-9]{16,64}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!ID_RE.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const url = await cxQuery<string | null>("files:getUrl", { id: name });
    if (!url) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(url, 302);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
