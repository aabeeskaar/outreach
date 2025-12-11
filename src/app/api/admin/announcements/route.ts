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

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.announcement.count(),
    ]);

    return NextResponse.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    const {
      title,
      message,
      type,
      showUntil,
      targetRoles,
      dismissible,
      link,
      linkText,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: type || "INFO",
        showUntil: showUntil ? new Date(showUntil) : null,
        targetRoles: targetRoles || ["USER"],
        dismissible: dismissible !== false,
        link,
        linkText,
      },
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "CREATE_ANNOUNCEMENT",
      entityType: "Announcement",
      entityId: announcement.id,
      newValue: { title, type },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, ...data } = body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...data,
        showUntil: data.showUntil ? new Date(data.showUntil) : null,
      },
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "UPDATE_ANNOUNCEMENT",
      entityType: "Announcement",
      entityId: id,
      newValue: data,
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("Update announcement error:", error);
    return NextResponse.json(
      { error: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { id } = await request.json();

    await prisma.announcement.delete({ where: { id } });

    await createAuditLog({
      userId: session.user?.id,
      action: "DELETE_ANNOUNCEMENT",
      entityType: "Announcement",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
