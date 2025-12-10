import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get profile completion percentage
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    let profileCompletion = 0;
    if (profile) {
      const fields = [
        profile.headline,
        profile.bio,
        profile.skills.length > 0,
        profile.interests.length > 0,
        Array.isArray(profile.education) && (profile.education as unknown[]).length > 0,
        Array.isArray(profile.experience) && (profile.experience as unknown[]).length > 0,
        profile.goals,
        profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl,
      ];
      const completedFields = fields.filter(Boolean).length;
      profileCompletion = Math.round((completedFields / fields.length) * 100);
    }

    // Get counts
    const [documentsCount, recipientsCount, emailsCount, gmailConnection, recentEmails] =
      await Promise.all([
        prisma.document.count({ where: { userId } }),
        prisma.recipient.count({ where: { userId } }),
        prisma.generatedEmail.count({ where: { userId, status: "SENT" } }),
        prisma.gmailConnection.findUnique({ where: { userId } }),
        prisma.generatedEmail.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            recipient: {
              select: { name: true },
            },
          },
        }),
      ]);

    return NextResponse.json({
      profileCompletion,
      documentsCount,
      recipientsCount,
      emailsCount,
      gmailConnected: !!gmailConnection,
      recentEmails: recentEmails.map((email) => ({
        id: email.id,
        subject: email.subject,
        recipientName: email.recipient.name,
        status: email.status,
        createdAt: email.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
