import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await createPayPalOrder(session.user.id);

    // Find the approval URL
    const approvalLink = order.links?.find(
      (link: { rel: string; href: string }) => link.rel === "approve"
    );

    return NextResponse.json({
      id: order.id,
      approvalUrl: approvalLink?.href,
    });
  } catch (error) {
    console.error("PayPal create order error:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
