import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const provider = searchParams.get("provider");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (provider) where.provider = provider;
    if (status) where.status = status;

    const [transactions, total, stats] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Get user info for transactions
    const userIds = [...new Set(transactions.map((t) => t.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const transactionsWithUsers = transactions.map((t) => ({
      ...t,
      user: userMap.get(t.userId),
    }));

    return NextResponse.json({
      transactions: transactionsWithUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalRevenue: stats._sum.amount || 0,
        totalTransactions: stats._count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
