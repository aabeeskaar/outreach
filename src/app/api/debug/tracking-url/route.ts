import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrackingPixelUrl } from "@/lib/email-tracking";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a sample tracking URL to show configuration
    const sampleTrackingId = "test-tracking-id";
    const trackingUrl = getTrackingPixelUrl(sampleTrackingId);

    return NextResponse.json({
      trackingUrl,
      envVars: {
        APP_URL: process.env.APP_URL || "(not set)",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "(not set)",
        VERCEL_URL: process.env.VERCEL_URL || "(not set)",
      },
      issue: trackingUrl.includes("localhost")
        ? "WARNING: Tracking URLs point to localhost. Email tracking will NOT work unless you're testing locally with the server running. For production, set APP_URL or NEXTAUTH_URL to your production domain."
        : null,
    });
  } catch (error) {
    console.error("Debug tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
