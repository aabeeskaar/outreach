import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const url = request.nextUrl.searchParams.get("url");

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
    }

    // Redirect to the original URL
    return NextResponse.redirect(decodedUrl);
  } catch (error) {
    console.error("Track click error:", error);
    // On error, try to redirect to the URL anyway
    const url = request.nextUrl.searchParams.get("url");
    if (url) {
      return NextResponse.redirect(decodeURIComponent(url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }
}
