import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: user.status,
      role: user.role,
      isActive: user.status === "ACTIVE",
      isSuspended: user.status === "SUSPENDED",
      isBanned: user.status === "BANNED",
    });
  } catch (error) {
    console.error("Failed to fetch user status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
