import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSubscriptionStatus } from "@/lib/subscription";
import UAParser from "ua-parser-js";

// Parse user agent to extract device info
function parseUserAgent(userAgent: string | null) {
  if (!userAgent) return { device: "Unknown", browser: "Unknown", os: "Unknown" };
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  return {
    device: result.device.type || "Desktop",
    browser: `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim(),
    os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
  };
}

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

    // Check subscription status
    const subscriptionStatus = await getSubscriptionStatus(session.user.id);
    const isPro = subscriptionStatus?.isPro || false;

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

    // Basic tracking for all users
    const basicResponse = {
      emailId: email.id,
      trackingId: email.trackingId,
      isPro,
      opens: {
        total: email.emailOpens.length,
        unique: uniqueOpenIps.size,
      },
      clicks: {
        total: email.linkClicks.length,
        unique: uniqueClicks.size,
      },
    };

    // Advanced tracking for Pro users only
    if (isPro) {
      // Parse device info for opens
      const deviceStats: Record<string, number> = {};
      const browserStats: Record<string, number> = {};
      const osStats: Record<string, number> = {};

      email.emailOpens.forEach((open) => {
        const parsed = parseUserAgent(open.userAgent);
        deviceStats[parsed.device] = (deviceStats[parsed.device] || 0) + 1;
        browserStats[parsed.browser] = (browserStats[parsed.browser] || 0) + 1;
        osStats[parsed.os] = (osStats[parsed.os] || 0) + 1;
      });

      // Timeline of opens by hour
      const openTimeline: Record<string, number> = {};
      email.emailOpens.forEach((open) => {
        const hour = new Date(open.openedAt).toISOString().slice(0, 13);
        openTimeline[hour] = (openTimeline[hour] || 0) + 1;
      });

      return NextResponse.json({
        ...basicResponse,
        opens: {
          ...basicResponse.opens,
          recent: email.emailOpens.slice(0, 20).map((o) => {
            const parsed = parseUserAgent(o.userAgent);
            return {
              openedAt: o.openedAt,
              device: parsed.device,
              browser: parsed.browser,
              os: parsed.os,
            };
          }),
          deviceStats,
          browserStats,
          osStats,
          timeline: openTimeline,
        },
        clicks: {
          ...basicResponse.clicks,
          byUrl: clicksByUrl,
          recent: email.linkClicks.slice(0, 20).map((c) => {
            const parsed = parseUserAgent(c.userAgent);
            return {
              clickedAt: c.clickedAt,
              url: c.originalUrl,
              device: parsed.device,
              browser: parsed.browser,
            };
          }),
        },
      });
    }

    return NextResponse.json(basicResponse);
  } catch (error) {
    console.error("Get tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
