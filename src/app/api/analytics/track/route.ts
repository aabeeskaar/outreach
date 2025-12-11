import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { path, referrer } = await request.json();

    // Get session ID from cookie or generate one
    const sessionId = request.cookies.get("session_id")?.value ||
      Math.random().toString(36).substring(2);

    await prisma.pageView.create({
      data: {
        path,
        userId: session?.user?.id || null,
        sessionId,
        userAgent: request.headers.get("user-agent") || null,
        referrer: referrer || null,
      },
    });

    const response = NextResponse.json({ success: true });

    // Set session cookie if not exists
    if (!request.cookies.get("session_id")) {
      response.cookies.set("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("Track page view error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
