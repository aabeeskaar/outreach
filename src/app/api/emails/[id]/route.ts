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

    return NextResponse.json(email);
  } catch (error) {
    console.error("Get email error:", error);
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

    const existing = await prisma.generatedEmail.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Only allow editing drafts
    if (existing.status === "SENT") {
      return NextResponse.json(
        { error: "Cannot edit a sent email" },
        { status: 400 }
      );
    }

    const email = await prisma.generatedEmail.update({
      where: { id },
      data: {
        subject: data.subject ?? existing.subject,
        body: data.body ?? existing.body,
        tone: data.tone ?? existing.tone,
        purpose: data.purpose ?? existing.purpose,
        attachedDocuments: data.attachedDocuments ?? existing.attachedDocuments,
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

    return NextResponse.json(email);
  } catch (error) {
    console.error("Update email error:", error);
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

    const existing = await prisma.generatedEmail.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    await prisma.generatedEmail.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
