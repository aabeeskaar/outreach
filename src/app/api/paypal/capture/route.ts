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

    // Get order details to find the userId
    const orderDetails = await getPayPalOrder(token);
    const userId = orderDetails.purchase_units?.[0]?.custom_id;

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
