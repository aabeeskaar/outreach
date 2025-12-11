import { NextResponse } from "next/server";
import { requireAdmin, getAdminStats } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
