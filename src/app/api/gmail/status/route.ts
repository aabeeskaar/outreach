import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await prisma.gmailConnection.findUnique({
      where: { userId: session.user.id },
      select: {
        connectedEmail: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      connected: !!connection,
      email: connection?.connectedEmail || null,
      expiresAt: connection?.expiresAt || null,
      connectedAt: connection?.createdAt || null,
    });
  } catch (error) {
    console.error("Gmail status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
