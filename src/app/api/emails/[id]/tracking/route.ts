import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get email with tracking data
    const email = await prisma.generatedEmail.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        emailOpens: {
          orderBy: { openedAt: "desc" },
        },
        linkClicks: {
          orderBy: { clickedAt: "desc" },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Calculate unique opens (by IP)
    const uniqueOpenIps = new Set(email.emailOpens.map((o) => o.ipAddress));

    // Calculate unique clicks (by IP + URL combination)
    const uniqueClicks = new Set(
      email.linkClicks.map((c) => `${c.ipAddress}-${c.originalUrl}`)
    );

    // Get click counts by URL
    const clicksByUrl: Record<string, number> = {};
    email.linkClicks.forEach((click) => {
      clicksByUrl[click.originalUrl] = (clicksByUrl[click.originalUrl] || 0) + 1;
    });

    return NextResponse.json({
      emailId: email.id,
      trackingId: email.trackingId,
      opens: {
        total: email.emailOpens.length,
        unique: uniqueOpenIps.size,
        recent: email.emailOpens.slice(0, 10).map((o) => ({
          openedAt: o.openedAt,
          ipAddress: o.ipAddress,
          userAgent: o.userAgent,
        })),
      },
      clicks: {
        total: email.linkClicks.length,
        unique: uniqueClicks.size,
        byUrl: clicksByUrl,
        recent: email.linkClicks.slice(0, 10).map((c) => ({
          clickedAt: c.clickedAt,
          url: c.originalUrl,
          ipAddress: c.ipAddress,
        })),
      },
    });
  } catch (error) {
    console.error("Get tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
