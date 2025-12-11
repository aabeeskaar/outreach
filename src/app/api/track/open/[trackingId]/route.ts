import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;

    console.log(`[Email Tracking] Open event for trackingId: ${trackingId}`);

    // Find the email by tracking ID
    const email = await prisma.generatedEmail.findUnique({
      where: { trackingId },
    });

    if (email) {
      // Record the open event
      await prisma.emailOpen.create({
        data: {
          emailId: email.id,
          ipAddress: request.headers.get("x-forwarded-for") ||
                     request.headers.get("x-real-ip") ||
                     "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
      console.log(`[Email Tracking] Open recorded for email: ${email.id}`);
    } else {
      console.log(`[Email Tracking] No email found for trackingId: ${trackingId}`);
    }

    // Always return the tracking pixel, even if email not found
    // This prevents revealing whether an email exists
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": TRACKING_PIXEL.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[Email Tracking] Error tracking open:", error);
    // Return pixel even on error
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
      },
    });
  }
}
