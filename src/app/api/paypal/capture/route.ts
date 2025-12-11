import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/pricing?error=missing_token", request.url)
      );
    }

    // Get order details to find the userId and promoCode
    const orderDetails = await getPayPalOrder(token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customIdRaw = (orderDetails as any).purchaseUnits?.[0]?.customId;

    // Parse customId - it may be JSON with userId and promoCode, or just userId
    let userId: string | undefined;
    let promoCode: string | null = null;

    try {
      const parsed = JSON.parse(customIdRaw);
      userId = parsed.userId;
      promoCode = parsed.promoCode;
    } catch {
      // Old format - just userId
      userId = customIdRaw;
    }

    if (!userId) {
      return NextResponse.redirect(
        new URL("/pricing?error=invalid_order", request.url)
      );
    }

    // Capture the payment
    const captureResult = await capturePayPalOrder(token);

    if (captureResult.status === "COMPLETED") {
      // Calculate subscription period (1 month)
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      // Get amount paid from capture result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const captureAny = captureResult as any;
      const amountPaid = parseFloat(
        captureAny.purchaseUnits?.[0]?.payments?.captures?.[0]?.amount?.value || "10.00"
      );
      const transactionId = captureAny.purchaseUnits?.[0]?.payments?.captures?.[0]?.id || token;

      // Create or update subscription
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

      // Record payment transaction
      await prisma.paymentTransaction.create({
        data: {
          userId,
          provider: "PAYPAL",
          providerTxId: transactionId,
          amount: amountPaid,
          currency: "USD",
          status: "COMPLETED",
          type: "SUBSCRIPTION",
          metadata: {
            orderId: token,
            promoCode: promoCode,
          },
        },
      });

      // Record promo code usage if applicable
      if (promoCode) {
        const promo = await prisma.promoCode.findUnique({
          where: { code: promoCode.toUpperCase() },
        });
        if (promo) {
          await prisma.promoCodeUse.create({
            data: {
              promoCodeId: promo.id,
              userId,
            },
          });
        }
      }

      return NextResponse.redirect(
        new URL("/dashboard?success=true&payment=paypal", request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL("/pricing?error=payment_failed", request.url)
      );
    }
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.redirect(
      new URL("/pricing?error=capture_failed", request.url)
    );
  }
}
