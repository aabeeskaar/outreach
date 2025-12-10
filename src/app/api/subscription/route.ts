import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getSubscriptionStatus(session.user.id);

    if (!status) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
