import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

// Get single user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        profile: true,
        _count: {
          select: {
            generatedEmails: true,
            documents: true,
            recipients: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// Update user (role, status, subscription)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let result;
    const oldValue = { role: user.role, status: user.status };

    switch (action) {
      case "makeAdmin":
        result = await prisma.user.update({
          where: { id },
          data: { role: "ADMIN" },
        });
        await createAuditLog({
          userId: session.user?.id,
          action: "MAKE_ADMIN",
          entityType: "User",
          entityId: id,
          oldValue: { role: user.role },
          newValue: { role: "ADMIN" },
        });
        break;

      case "removeAdmin":
        result = await prisma.user.update({
          where: { id },
          data: { role: "USER" },
        });
        await createAuditLog({
          userId: session.user?.id,
          action: "REMOVE_ADMIN",
          entityType: "User",
          entityId: id,
          oldValue: { role: user.role },
          newValue: { role: "USER" },
        });
        break;

      case "suspend":
        result = await prisma.user.update({
          where: { id },
          data: { status: "SUSPENDED" },
        });
        await createAuditLog({
          userId: session.user?.id,
          action: "SUSPEND_USER",
          entityType: "User",
          entityId: id,
          oldValue: { status: user.status },
          newValue: { status: "SUSPENDED" },
        });
        break;

      case "ban":
        result = await prisma.user.update({
          where: { id },
          data: { status: "BANNED" },
        });
        await createAuditLog({
          userId: session.user?.id,
          action: "BAN_USER",
          entityType: "User",
          entityId: id,
          oldValue: { status: user.status },
          newValue: { status: "BANNED" },
        });
        break;

      case "activate":
        result = await prisma.user.update({
          where: { id },
          data: { status: "ACTIVE" },
        });
        await createAuditLog({
          userId: session.user?.id,
          action: "ACTIVATE_USER",
          entityType: "User",
          entityId: id,
          oldValue: { status: user.status },
          newValue: { status: "ACTIVE" },
        });
        break;

      case "grantPro":
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (data.months || 1));

        result = await prisma.subscription.upsert({
          where: { userId: id },
          create: {
            userId: id,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: endDate,
          },
          update: {
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: endDate,
          },
        });

        // Record payment
        await prisma.paymentTransaction.create({
          data: {
            userId: id,
            provider: "MANUAL",
            amount: 0,
            status: "COMPLETED",
            type: "SUBSCRIPTION",
            description: `Manual Pro grant for ${data.months || 1} month(s)`,
          },
        });

        await createAuditLog({
          userId: session.user?.id,
          action: "GRANT_PRO",
          entityType: "Subscription",
          entityId: id,
          oldValue: { status: user.subscription?.status },
          newValue: { status: "ACTIVE", months: data.months || 1 },
        });
        break;

      case "revokePro":
        result = await prisma.subscription.update({
          where: { userId: id },
          data: { status: "CANCELED" },
        });
        await createAuditLog({
          userId: session.user?.id,
          action: "REVOKE_PRO",
          entityType: "Subscription",
          entityId: id,
          oldValue: { status: user.subscription?.status },
          newValue: { status: "CANCELED" },
        });
        break;

      case "resetEmailCount":
        result = await prisma.user.update({
          where: { id },
          data: { freeEmailsUsed: 0 },
        });
        await createAuditLog({
          userId: session.user?.id,
          action: "RESET_EMAIL_COUNT",
          entityType: "User",
          entityId: id,
          oldValue: { freeEmailsUsed: user.freeEmailsUsed },
          newValue: { freeEmailsUsed: 0 },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("User action error:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow deleting yourself
    if (user.id === session.user?.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: session.user?.id,
      action: "DELETE_USER",
      entityType: "User",
      entityId: id,
      oldValue: { email: user.email, name: user.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
