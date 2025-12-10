import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";

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

    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        generatedEmails: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json(recipient);
  } catch (error) {
    console.error("Get recipient error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.recipient.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    const recipient = await prisma.recipient.update({
      where: { id },
      data: {
        name: data.name?.slice(0, 200) || existing.name,
        email: data.email?.slice(0, 200) || existing.email,
        organization: data.organization?.slice(0, 200) ?? existing.organization,
        role: data.role?.slice(0, 200) ?? existing.role,
        website: data.website?.slice(0, 500) ?? existing.website,
        linkedinUrl: data.linkedinUrl?.slice(0, 500) ?? existing.linkedinUrl,
        workFocus: data.workFocus?.slice(0, 2000) ?? existing.workFocus,
        additionalNotes: data.additionalNotes?.slice(0, 2000) ?? existing.additionalNotes,
      },
    });

    return NextResponse.json(recipient);
  } catch (error) {
    console.error("Update recipient error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.recipient.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    await prisma.recipient.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete recipient error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
