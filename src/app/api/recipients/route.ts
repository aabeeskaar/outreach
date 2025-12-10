import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipients = await prisma.recipient.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { generatedEmails: true },
        },
      },
    });

    return NextResponse.json(recipients);
  } catch (error) {
    console.error("Get recipients error:", error);
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
    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const recipient = await prisma.recipient.create({
      data: {
        userId: session.user.id,
        name: data.name.slice(0, 200),
        email: data.email.slice(0, 200),
        organization: data.organization?.slice(0, 200) || null,
        role: data.role?.slice(0, 200) || null,
        website: data.website?.slice(0, 500) || null,
        linkedinUrl: data.linkedinUrl?.slice(0, 500) || null,
        workFocus: data.workFocus?.slice(0, 2000) || null,
        additionalNotes: data.additionalNotes?.slice(0, 2000) || null,
      },
    });

    return NextResponse.json(recipient, { status: 201 });
  } catch (error) {
    console.error("Create recipient error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
