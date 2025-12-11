import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          createdAt: true,
          freeEmailsUsed: true,
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              generatedEmails: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

// Toggle Pro status for a user
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "grant_pro") {
      // Grant Pro status - create or update subscription
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year Pro

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        },
        update: {
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        },
      });

      await createAuditLog({
        userId: session.user?.id,
        action: "GRANT_PRO",
        entityType: "User",
        entityId: userId,
        newValue: { grantedTo: user.email, expiresAt: endDate },
      });

      return NextResponse.json({ success: true, status: "ACTIVE" });
    } else if (action === "revoke_pro") {
      // Revoke Pro status
      if (user.subscription) {
        await prisma.subscription.update({
          where: { userId },
          data: { status: "CANCELED" },
        });
      }

      await createAuditLog({
        userId: session.user?.id,
        action: "REVOKE_PRO",
        entityType: "User",
        entityId: userId,
        newValue: { revokedFrom: user.email },
      });

      return NextResponse.json({ success: true, status: "CANCELED" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update user error:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
