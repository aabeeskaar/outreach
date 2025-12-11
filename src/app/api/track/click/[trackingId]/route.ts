import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const url = request.nextUrl.searchParams.get("url");

    console.log(`[Email Tracking] Click event for trackingId: ${trackingId}`);

    if (!url) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);

    // Find the email by tracking ID
    const email = await prisma.generatedEmail.findUnique({
      where: { trackingId },
    });

    if (email) {
      // Record the click event
      await prisma.linkClick.create({
        data: {
          emailId: email.id,
          originalUrl: decodedUrl,
          ipAddress: request.headers.get("x-forwarded-for") ||
                     request.headers.get("x-real-ip") ||
                     "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
      console.log(`[Email Tracking] Click recorded for email: ${email.id}, URL: ${decodedUrl}`);
    } else {
      console.log(`[Email Tracking] No email found for trackingId: ${trackingId}`);
    }

    // Redirect to the original URL
    return NextResponse.redirect(decodedUrl);
  } catch (error) {
    console.error("[Email Tracking] Error tracking click:", error);
    // On error, try to redirect to the URL anyway
    const url = request.nextUrl.searchParams.get("url");
    if (url) {
      return NextResponse.redirect(decodeURIComponent(url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }
}
