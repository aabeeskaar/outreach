import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Mark conversation as read
    await prisma.generatedEmail.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        conversationRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
