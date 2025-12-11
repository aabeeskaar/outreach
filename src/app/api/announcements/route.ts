import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    // Get user role for targeting
    let userRole = "USER";
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      userRole = user?.role || "USER";
    }

    // Check if user has pro subscription
    let isPro = false;
    if (session?.user?.id) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { status: true },
      });
      isPro = subscription?.status === "ACTIVE";
    }

    const now = new Date();

    // Fetch active announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        showFrom: { lte: now },
        OR: [
          { showUntil: null },
          { showUntil: { gte: now } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by target roles (targetRoles is stored as string array)
    const filteredAnnouncements = announcements.filter((a) => {
      const roles = a.targetRoles as string[];
      if (roles.length === 0) return true; // No targeting = show to all
      if (roles.includes("ALL")) return true;
      if (roles.includes("ADMIN") && userRole === "ADMIN") return true;
      if (roles.includes("PRO") && isPro) return true;
      if (roles.includes("FREE") && !isPro) return true;
      if (roles.includes("USER")) return true;
      return false;
    });

    return NextResponse.json({
      announcements: filteredAnnouncements.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        dismissible: a.dismissible,
        link: a.link,
        linkText: a.linkText,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return NextResponse.json({ announcements: [] });
  }
}
