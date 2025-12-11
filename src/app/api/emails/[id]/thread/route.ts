import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getThreadMessages } from "@/lib/gmail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get email with Gmail thread ID
    const email = await prisma.generatedEmail.findFirst({
      where: {
        id,
        userId: session.user.id,
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

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    if (!email.gmailThreadId) {
      return NextResponse.json(
        { error: "This email does not have a Gmail thread associated" },
        { status: 400 }
      );
    }

    // Get all messages in the thread
    const messages = await getThreadMessages(session.user.id, email.gmailThreadId);

    // Count replies (messages not from the user)
    const replyCount = messages.filter((m) => !m.isFromMe).length;

    return NextResponse.json({
      email: {
        id: email.id,
        subject: email.subject,
        recipient: email.recipient,
        sentAt: email.sentAt,
      },
      thread: {
        id: email.gmailThreadId,
        messageCount: messages.length,
        replyCount,
        messages,
      },
    });
  } catch (error) {
    console.error("Get thread error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
