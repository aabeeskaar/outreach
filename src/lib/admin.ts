import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role === "ADMIN";
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }

  return session;
}

export async function getAdminStats() {
  const [
    totalUsers,
    totalEmails,
    totalEmailsSent,
    proUsers,
    openTickets,
    pendingFeedback,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.generatedEmail.count(),
    prisma.generatedEmail.count({ where: { status: "SENT" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.feedback.count(),
  ]);

  // Get users created in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newUsersThisWeek = await prisma.user.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  // Get emails generated in last 7 days
  const emailsThisWeek = await prisma.generatedEmail.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  return {
    totalUsers,
    totalEmails,
    totalEmailsSent,
    proUsers,
    openTickets,
    pendingFeedback,
    newUsersThisWeek,
    emailsThisWeek,
  };
}
