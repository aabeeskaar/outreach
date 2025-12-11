import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendReply, getThreadMessages } from "@/lib/gmail";

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
    const { body } = await request.json();

    if (!body || typeof body !== "string" || body.trim().length === 0) {
      return NextResponse.json(
        { error: "Reply body is required" },
        { status: 400 }
      );
    }

    // Get email with Gmail thread ID
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

    if (!email.gmailThreadId || !email.gmailMessageId) {
      return NextResponse.json(
        { error: "This email does not have a Gmail thread associated" },
        { status: 400 }
      );
    }

    // Get the latest message in the thread to reply to
    const messages = await getThreadMessages(session.user.id, email.gmailThreadId);
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage) {
      return NextResponse.json(
        { error: "Could not find messages in thread" },
        { status: 400 }
      );
    }

    // Determine who to reply to (the last person who sent a message that's not the user)
    const replyTo = latestMessage.isFromMe
      ? email.recipient.email
      : latestMessage.from;

    // Extract email address from "Name <email>" format
    const emailMatch = replyTo.match(/<([^>]+)>/) || [null, replyTo];
    const replyToEmail = emailMatch[1] || replyTo;

    // Convert body to HTML
    const htmlBody = body
      .split("\n\n")
      .map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");

    // Send the reply
    const result = await sendReply(
      session.user.id,
      email.gmailThreadId,
      latestMessage.id,
      replyToEmail,
      email.subject,
      htmlBody
    );

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    });
  } catch (error) {
    console.error("Send reply error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
