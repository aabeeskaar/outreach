import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const settings = await prisma.appSetting.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, typeof settings>);

    return NextResponse.json({ settings, grouped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { key, value, type, category } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    const setting = await prisma.appSetting.upsert({
      where: { key },
      create: {
        key,
        value: String(value),
        type: type || "string",
        category: category || "general",
      },
      update: {
        value: String(value),
        type: type || "string",
        category: category || "general",
      },
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "UPDATE_SETTING",
      entityType: "AppSetting",
      entityId: key,
      newValue: { key, value },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Update setting error:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { key } = await request.json();

    await prisma.appSetting.delete({ where: { key } });

    await createAuditLog({
      userId: session.user?.id,
      action: "DELETE_SETTING",
      entityType: "AppSetting",
      entityId: key,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete setting error:", error);
    return NextResponse.json(
      { error: "Failed to delete setting" },
      { status: 500 }
    );
  }
}
