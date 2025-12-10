import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableProviders } from "@/lib/ai";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providers = getAvailableProviders();

    return NextResponse.json({
      providers,
      default: providers.includes("gemini") ? "gemini" : providers[0] || null,
    });
  } catch (error) {
    console.error("Get providers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
