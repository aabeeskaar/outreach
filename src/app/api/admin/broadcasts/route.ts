import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import { sendBulkEmails, isEmailConfigured } from "@/lib/email";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [broadcasts, total] = await Promise.all([
      prisma.emailBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { name: true, email: true } },
        },
      }),
      prisma.emailBroadcast.count(),
    ]);

    return NextResponse.json({
      broadcasts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { subject, body: emailBody, targetType, targetValue, scheduledAt } = body;

    if (!subject || !emailBody || !targetType) {
      return NextResponse.json(
        { error: "Subject, body, and target type are required" },
        { status: 400 }
      );
    }

    const broadcast = await prisma.emailBroadcast.create({
      data: {
        subject,
        body: emailBody,
        targetType,
        targetValue,
        senderId: session.user?.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
      },
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "CREATE_BROADCAST",
      entityType: "EmailBroadcast",
      entityId: broadcast.id,
      newValue: { subject, targetType },
    });

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error("Create broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to create broadcast" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, action: broadcastAction, ...data } = body;

    if (broadcastAction === "send") {
      // Check if email is configured
      if (!isEmailConfigured()) {
        return NextResponse.json(
          { error: "Email is not configured. Set SMTP_* or GMAIL_* environment variables." },
          { status: 400 }
        );
      }

      // Get target users
      const broadcast = await prisma.emailBroadcast.findUnique({
        where: { id },
      });

      if (!broadcast) {
        return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
      }

      let userFilter: Record<string, unknown> = {};
      switch (broadcast.targetType) {
        case "PRO_USERS":
          userFilter = {
            subscription: { status: "ACTIVE" },
          };
          break;
        case "FREE_USERS":
          userFilter = {
            OR: [
              { subscription: null },
              { subscription: { status: { not: "ACTIVE" } } },
            ],
          };
          break;
        case "ADMINS":
          userFilter = {
            role: "ADMIN",
          };
          break;
        case "SPECIFIC_USERS":
          if (broadcast.targetValue) {
            userFilter = {
              id: { in: broadcast.targetValue.split(",") },
            };
          }
          break;
        // ALL_USERS - no filter needed
      }

      const users = await prisma.user.findMany({
        where: userFilter,
        select: { id: true, email: true, name: true },
      });

      if (users.length === 0) {
        return NextResponse.json({ error: "No users match the target criteria" }, { status: 400 });
      }

      // Update broadcast status to SENDING
      await prisma.emailBroadcast.update({
        where: { id },
        data: {
          status: "SENDING",
          sentAt: new Date(),
        },
      });

      // Actually send emails
      const recipients = users.map((u) => ({ email: u.email, name: u.name || undefined }));
      const { sent, failed } = await sendBulkEmails(
        recipients,
        broadcast.subject,
        broadcast.body
      );

      // Update broadcast with results
      await prisma.emailBroadcast.update({
        where: { id },
        data: {
          status: failed === users.length ? "FAILED" : "SENT",
          sentCount: sent,
          failedCount: failed,
        },
      });

      await createAuditLog({
        userId: session.user?.id,
        action: "SEND_BROADCAST",
        entityType: "EmailBroadcast",
        entityId: id,
        newValue: { recipientCount: users.length, sent, failed },
      });

      return NextResponse.json({
        success: true,
        sentTo: sent,
        failed,
        total: users.length,
      });
    }

    // Regular update
    const broadcast = await prisma.emailBroadcast.update({
      where: { id },
      data,
    });

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error("Update broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to update broadcast" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { id } = await request.json();

    await prisma.emailBroadcast.delete({ where: { id } });

    await createAuditLog({
      userId: session.user?.id,
      action: "DELETE_BROADCAST",
      entityType: "EmailBroadcast",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to delete broadcast" },
      { status: 500 }
    );
  }
}
