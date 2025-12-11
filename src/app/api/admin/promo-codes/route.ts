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

    const [codes, total] = await Promise.all([
      prisma.promoCode.findMany({
        include: {
          _count: { select: { uses: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promoCode.count(),
    ]);

    return NextResponse.json({
      codes,
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
      code,
      description,
      discountType,
      discountValue,
      maxUses,
      validUntil,
    } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: "Code, discount type, and value are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Promo code already exists" },
        { status: 400 }
      );
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "CREATE_PROMO_CODE",
      entityType: "PromoCode",
      entityId: promoCode.id,
      newValue: { code: promoCode.code, discountType, discountValue },
    });

    return NextResponse.json(promoCode);
  } catch (error) {
    console.error("Create promo code error:", error);
    return NextResponse.json(
      { error: "Failed to create promo code" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { id, isActive } = body;

    const promoCode = await prisma.promoCode.update({
      where: { id },
      data: { isActive },
    });

    await createAuditLog({
      userId: session.user?.id,
      action: isActive ? "ACTIVATE_PROMO_CODE" : "DEACTIVATE_PROMO_CODE",
      entityType: "PromoCode",
      entityId: id,
      newValue: { isActive },
    });

    return NextResponse.json(promoCode);
  } catch (error) {
    console.error("Update promo code error:", error);
    return NextResponse.json(
      { error: "Failed to update promo code" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { id } = await request.json();

    const promoCode = await prisma.promoCode.delete({
      where: { id },
    });

    await createAuditLog({
      userId: session.user?.id,
      action: "DELETE_PROMO_CODE",
      entityType: "PromoCode",
      entityId: id,
      oldValue: { code: promoCode.code },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete promo code error:", error);
    return NextResponse.json(
      { error: "Failed to delete promo code" },
      { status: 500 }
    );
  }
}
