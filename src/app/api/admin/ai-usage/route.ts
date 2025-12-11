import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const provider = searchParams.get("provider");
    const period = searchParams.get("period") || "7d";

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

    const where: Record<string, unknown> = {
      createdAt: { gte: startDate },
    };
    if (provider) where.provider = provider;

    const [usage, total, byProvider, dailyUsage] = await Promise.all([
      prisma.aIUsage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aIUsage.count({ where }),
      prisma.aIUsage.groupBy({
        by: ["provider"],
        where: { createdAt: { gte: startDate } },
        _count: true,
        _sum: { tokens: true, cost: true },
      }),
      getDailyAIUsage(startDate),
    ]);

    // Get user info
    const userIds = [...new Set(usage.map((u) => u.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const usageWithUsers = usage.map((u) => ({
      ...u,
      user: userMap.get(u.userId),
    }));

    // Calculate totals
    const totalRequests = byProvider.reduce((acc, p) => acc + p._count, 0);
    const totalTokens = byProvider.reduce((acc, p) => acc + (p._sum.tokens || 0), 0);
    const totalCost = byProvider.reduce((acc, p) => acc + (p._sum.cost || 0), 0);
    const successRate = await prisma.aIUsage.count({
      where: { ...where, success: true },
    });

    return NextResponse.json({
      usage: usageWithUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalRequests,
        totalTokens,
        totalCost,
        successRate: total > 0 ? ((successRate / total) * 100).toFixed(1) : 100,
      },
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        count: p._count,
        tokens: p._sum.tokens || 0,
        cost: p._sum.cost || 0,
      })),
      dailyUsage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

async function getDailyAIUsage(startDate: Date) {
  const result = [];
  const now = new Date();
  const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = Math.min(days, 7) - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = await prisma.aIUsage.count({
      where: {
        createdAt: { gte: date, lt: nextDate },
      },
    });

    result.push({
      date: date.toISOString().split("T")[0],
      count,
    });
  }

  return result;
}
