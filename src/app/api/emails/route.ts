import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const recipientId = searchParams.get("recipientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (recipientId) {
      where.recipientId = recipientId;
    }

    const [emails, total] = await Promise.all([
      prisma.generatedEmail.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          recipient: {
            select: {
              name: true,
              email: true,
              organization: true,
            },
          },
          _count: {
            select: {
              emailOpens: true,
              linkClicks: true,
            },
          },
        },
      }),
      prisma.generatedEmail.count({ where }),
    ]);

    // Transform emails to include tracking counts
    const emailsWithTracking = emails.map((email) => ({
      ...email,
      openCount: email._count.emailOpens,
      clickCount: email._count.linkClicks,
      _count: undefined,
    }));

    return NextResponse.json({
      emails: emailsWithTracking,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get emails error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.recipientId || !data.subject || !data.body) {
      return NextResponse.json(
        { error: "Recipient, subject, and body are required" },
        { status: 400 }
      );
    }

    // Verify recipient belongs to user
    const recipient = await prisma.recipient.findFirst({
      where: {
        id: data.recipientId,
        userId: session.user.id,
      },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    const email = await prisma.generatedEmail.create({
      data: {
        userId: session.user.id,
        recipientId: data.recipientId,
        subject: data.subject,
        body: data.body,
        tone: data.tone || "FORMAL",
        purpose: data.purpose || "OTHER",
        attachedDocuments: data.attachedDocuments || [],
        status: "DRAFT",
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

    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    console.error("Create email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
