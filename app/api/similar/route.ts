import { NextRequest, NextResponse } from "next/server";
import { getSimilarTitles } from "@/lib/similar";

export async function GET(req: NextRequest) {
  const jwId = req.nextUrl.searchParams.get("jwId");
  if (!jwId) {
    return NextResponse.json({ error: "Missing jwId" }, { status: 400 });
  }

  const similar = await getSimilarTitles(jwId);
  return NextResponse.json({ similar });
}
