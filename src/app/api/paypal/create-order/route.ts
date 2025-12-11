import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPayPalOrder } from "@/lib/paypal";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check if PayPal is configured
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "PayPal is not configured. Please contact support." },
        { status: 503 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body for promo code
    let promoCode: string | undefined;
    let discountAmount = 0;

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
              discountAmount = (10 * promo.discountValue) / 100;
            } else if (promo.discountType === "FIXED_AMOUNT") {
              discountAmount = Math.min(promo.discountValue, 10);
            }
            // FREE_TRIAL_DAYS not supported for PayPal one-time payment
          }
        }
      }
    } catch {
      // No body or invalid JSON, proceed without promo
    }

    const order = await createPayPalOrder(session.user.id, { promoCode, discountAmount });

    // Find the approval URL - check both 'approve' and 'payer-action' rels
    const approvalLink = order.links?.find(
      (link: { rel: string; href: string }) =>
        link.rel === "approve" || link.rel === "payer-action"
    );

    if (!approvalLink?.href) {
      console.error("No approval URL found in PayPal order:", order);
      return NextResponse.json(
        { error: "Failed to get PayPal approval URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: order.id,
      approvalUrl: approvalLink.href,
    });
  } catch (error) {
    console.error("PayPal create order error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create PayPal order: ${message}` },
      { status: 500 }
    );
  }
}
