import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST() {
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

    const order = await createPayPalOrder(session.user.id);

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
