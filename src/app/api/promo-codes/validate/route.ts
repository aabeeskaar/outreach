import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: { select: { uses: true } },
      },
    });

    if (!promoCode) {
      return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
    }

    // Check if active
    if (!promoCode.isActive) {
      return NextResponse.json({ error: "This promo code is no longer active" }, { status: 400 });
    }

    // Check validity dates
    const now = new Date();
    if (promoCode.validFrom > now) {
      return NextResponse.json({ error: "This promo code is not yet valid" }, { status: 400 });
    }
    if (promoCode.validUntil && promoCode.validUntil < now) {
      return NextResponse.json({ error: "This promo code has expired" }, { status: 400 });
    }

    // Check max uses
    if (promoCode.maxUses && promoCode._count.uses >= promoCode.maxUses) {
      return NextResponse.json({ error: "This promo code has reached its usage limit" }, { status: 400 });
    }

    // Check if user already used this code
    const existingUse = await prisma.promoCodeUse.findFirst({
      where: {
        promoCodeId: promoCode.id,
        userId: session.user.id,
      },
    });

    if (existingUse) {
      return NextResponse.json({ error: "You have already used this promo code" }, { status: 400 });
    }

    // Calculate discount
    let discountText = "";
    let discountAmount = 0;
    const basePrice = 10; // Monthly price

    switch (promoCode.discountType) {
      case "PERCENTAGE":
        discountAmount = (basePrice * promoCode.discountValue) / 100;
        discountText = `${promoCode.discountValue}% off`;
        break;
      case "FIXED_AMOUNT":
        discountAmount = Math.min(promoCode.discountValue, basePrice);
        discountText = `$${promoCode.discountValue} off`;
        break;
      case "FREE_TRIAL_DAYS":
        discountText = `${promoCode.discountValue} days free trial`;
        break;
    }

    return NextResponse.json({
      valid: true,
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      discountText,
      discountAmount,
      finalPrice: Math.max(0, basePrice - discountAmount),
      description: promoCode.description,
    });
  } catch (error) {
    console.error("Failed to validate promo code:", error);
    return NextResponse.json({ error: "Failed to validate promo code" }, { status: 500 });
  }
}
