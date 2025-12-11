import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";
import { sendEmail, getGmailConnection } from "@/lib/gmail";
import { generateTrackingId, addTrackingToEmail } from "@/lib/email-tracking";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check Gmail connection
    const gmailConnection = await getGmailConnection(session.user.id);
    if (!gmailConnection) {
      return NextResponse.json(
        { error: "Gmail not connected. Please connect Gmail in settings." },
        { status: 400 }
      );
    }

    // Get email with recipient
    const email = await prisma.generatedEmail.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        recipient: true,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    if (email.status === "SENT") {
      return NextResponse.json(
        { error: "Email has already been sent" },
        { status: 400 }
      );
    }

    // Prepare attachments if any
    let attachments: Array<{
      filename: string;
      content: Buffer;
      mimeType: string;
    }> = [];

    if (email.attachedDocuments.length > 0) {
      const documents = await prisma.document.findMany({
        where: {
          id: { in: email.attachedDocuments },
          userId: session.user.id,
        },
      });

      attachments = await Promise.all(
        documents.map(async (doc) => {
          const filePath = path.join(UPLOAD_DIR, doc.filePath);
          const content = await readFile(filePath);
          return {
            filename: doc.name,
            content,
            mimeType: doc.mimeType || "application/octet-stream",
          };
        })
      );
    }

    // Convert body to HTML for better formatting
    const htmlBody = email.body
      .split("\n\n")
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");

    // Generate tracking ID for this email
    const trackingId = generateTrackingId();

    // Add tracking pixel and wrap links
    const trackedHtmlBody = addTrackingToEmail(htmlBody, trackingId);

    try {
      // Send email via Gmail with tracking
      const gmailResponse = await sendEmail(
        session.user.id,
        email.recipient.email,
        email.subject,
        trackedHtmlBody,
        attachments
      );

      // Update email status with tracking ID and Gmail IDs for reply tracking
      const updatedEmail = await prisma.generatedEmail.update({
        where: { id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          trackingId,
          gmailMessageId: gmailResponse.id,
          gmailThreadId: gmailResponse.threadId,
        },
        include: {
          recipient: {
            select: {
              name: true,
              email: true,
              organization: true,
            },
          },
        },
      });

      return NextResponse.json(updatedEmail);
    } catch (sendError) {
      console.error("Send email error:", sendError);

      // Update email with error
      await prisma.generatedEmail.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage:
            sendError instanceof Error ? sendError.message : "Failed to send email",
        },
      });

      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Send email route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
