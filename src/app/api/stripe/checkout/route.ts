import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body for promo code
    let promoCode: string | undefined;
    let discountPercent: number | undefined;
    let trialDays: number | undefined;

    try {
      const body = await request.json();
      promoCode = body.promoCode;

      // Validate promo code if provided
      if (promoCode) {
        const promo = await prisma.promoCode.findUnique({
          where: { code: promoCode.toUpperCase() },
          include: { _count: { select: { uses: true } } },
        });

        if (promo && promo.isActive) {
          const now = new Date();
          const isValid =
            promo.validFrom <= now &&
            (!promo.validUntil || promo.validUntil >= now) &&
            (!promo.maxUses || promo._count.uses < promo.maxUses);

          // Check if user already used this code
          const existingUse = await prisma.promoCodeUse.findFirst({
            where: { promoCodeId: promo.id, userId: session.user.id },
          });

          if (isValid && !existingUse) {
            if (promo.discountType === "PERCENTAGE") {
              discountPercent = promo.discountValue;
            } else if (promo.discountType === "FREE_TRIAL_DAYS") {
              trialDays = promo.discountValue;
            }
            // FIXED_AMOUNT is handled differently - we'll convert to percentage
            else if (promo.discountType === "FIXED_AMOUNT") {
              // $10 base price, so $X off = X*10 percent off
              discountPercent = Math.min(promo.discountValue * 10, 100);
            }
          }
        }
      }
    } catch {
      // No body or invalid JSON, proceed without promo
    }

    const checkoutSession = await createCheckoutSession(
      session.user.id,
      session.user.email,
      { promoCode, discountPercent, trialDays }
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
