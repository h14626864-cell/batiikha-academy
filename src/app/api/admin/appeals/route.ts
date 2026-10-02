import { NextRequest, NextResponse } from "next/server";
import { cxQuery, cxMutation, serialize, convexError } from "@/lib/convex";
import { getSessionUser } from "@/lib/api-helpers";

async function onlyAdmin() {
  const user = await getSessionUser();
  return user && user.role === "ADMIN" ? user : null;
}

/** Admin: list all appeals (طعون) */
export async function GET() {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const rows = await cxQuery("moderation:listAppeals", {});
    return NextResponse.json(serialize(rows));
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Admin: review an appeal — accept (lift ban + unblock email) or reject. */
export async function POST(req: NextRequest) {
  if (!(await onlyAdmin())) return NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
  try {
    const { appealId, accept } = await req.json();
    if (!appealId || typeof accept !== "boolean") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    await cxMutation("moderation:reviewAppeal", { appealId, accept });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { error, status } = convexError(e);
    return NextResponse.json({ error }, { status });
  }
}
