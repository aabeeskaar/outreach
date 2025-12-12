import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the default AI provider setting
    const setting = await prisma.appSetting.findUnique({
      where: { key: "ai.default_provider" },
    });

    return NextResponse.json({
      defaultProvider: setting?.value || "gemini",
    });
  } catch (error) {
    console.error("Get AI settings error:", error);
    return NextResponse.json({ defaultProvider: "gemini" });
  }
}
