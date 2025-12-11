import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get all stats in parallel
    const [
      // User stats
      totalUsers,
      newUsersInPeriod,
      activeUsersInPeriod,

      // Subscription stats
      totalProUsers,
      newProUsersInPeriod,
      canceledInPeriod,

      // Email stats
      totalEmails,
      emailsInPeriod,
      sentEmailsInPeriod,

      // Page views
      totalPageViews,
      pageViewsInPeriod,
      uniqueVisitorsInPeriod,

      // Top pages
      topPages,

      // Daily breakdown
      dailyPageViews,
      dailyNewUsers,
      dailyEmails,

      // User by plan
      usersByPlan,

      // Recent signups
      recentSignups,
    ] = await Promise.all([
      // User stats
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.user.count({
        where: {
          generatedEmails: {
            some: { createdAt: { gte: startDate } },
          },
        },
      }),

      // Subscription stats
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          createdAt: { gte: startDate },
        },
      }),
      prisma.subscription.count({
        where: {
          status: "CANCELED",
          updatedAt: { gte: startDate },
        },
      }),

      // Email stats
      prisma.generatedEmail.count(),
      prisma.generatedEmail.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.generatedEmail.count({
        where: {
          status: "SENT",
          createdAt: { gte: startDate },
        },
      }),

      // Page views
      prisma.pageView.count(),
      prisma.pageView.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.pageView.groupBy({
        by: ["sessionId"],
        where: { createdAt: { gte: startDate } },
      }).then((r) => r.length),

      // Top pages
      prisma.pageView.groupBy({
        by: ["path"],
        where: { createdAt: { gte: startDate } },
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),

      // Daily page views (last 7 days for chart)
      getDailyStats(prisma, "pageView", 7),
      getDailyStats(prisma, "user", 7),
      getDailyStats(prisma, "email", 7),

      // Users by plan
      (async () => {
        const pro = await prisma.subscription.count({ where: { status: "ACTIVE" } });
        const total = await prisma.user.count();
        return { free: total - pro, pro };
      })(),

      // Recent signups
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
          subscription: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Calculate revenue (assuming $10/month per pro user)
    const estimatedRevenue = totalProUsers * 10;
    const periodRevenue = newProUsersInPeriod * 10;

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsersInPeriod,
        activeUsersInPeriod,
        totalProUsers,
        newProUsersInPeriod,
        canceledInPeriod,
        conversionRate: totalUsers > 0 ? ((totalProUsers / totalUsers) * 100).toFixed(1) : 0,
        churnRate: totalProUsers > 0 ? ((canceledInPeriod / (totalProUsers + canceledInPeriod)) * 100).toFixed(1) : 0,
      },
      emails: {
        total: totalEmails,
        inPeriod: emailsInPeriod,
        sentInPeriod: sentEmailsInPeriod,
        avgPerUser: totalUsers > 0 ? (totalEmails / totalUsers).toFixed(1) : 0,
      },
      pageViews: {
        total: totalPageViews,
        inPeriod: pageViewsInPeriod,
        uniqueVisitors: uniqueVisitorsInPeriod,
        avgPerVisitor: uniqueVisitorsInPeriod > 0 ? (pageViewsInPeriod / uniqueVisitorsInPeriod).toFixed(1) : 0,
      },
      revenue: {
        estimated: estimatedRevenue,
        periodRevenue,
        mrr: estimatedRevenue,
        arr: estimatedRevenue * 12,
      },
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p._count.path,
      })),
      charts: {
        pageViews: dailyPageViews,
        newUsers: dailyNewUsers,
        emails: dailyEmails,
      },
      usersByPlan,
      recentSignups,
      period,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDailyStats(prisma: any, type: string, days: number) {
  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    let count = 0;
    if (type === "pageView") {
      count = await prisma.pageView.count({
        where: {
          createdAt: { gte: date, lt: nextDate },
        },
      });
    } else if (type === "user") {
      count = await prisma.user.count({
        where: {
          createdAt: { gte: date, lt: nextDate },
        },
      });
    } else if (type === "email") {
      count = await prisma.generatedEmail.count({
        where: {
          createdAt: { gte: date, lt: nextDate },
        },
      });
    }

    result.push({
      date: date.toISOString().split("T")[0],
      count,
    });
  }

  return result;
}
