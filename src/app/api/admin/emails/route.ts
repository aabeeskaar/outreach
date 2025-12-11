import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.generatedEmail.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          recipient: {
            select: { id: true, name: true, email: true, organization: true },
          },
          _count: {
            select: { emailOpens: true, linkClicks: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.generatedEmail.count({ where }),
    ]);

    // Stats
    const [totalEmails, sentEmails, draftEmails] = await Promise.all([
      prisma.generatedEmail.count(),
      prisma.generatedEmail.count({ where: { status: "SENT" } }),
      prisma.generatedEmail.count({ where: { status: "DRAFT" } }),
    ]);

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalEmails,
        sent: sentEmails,
        draft: draftEmails,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
