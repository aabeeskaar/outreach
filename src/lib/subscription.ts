import prisma from "./prisma";
import { PLANS } from "./stripe";

export async function canGenerateEmail(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remainingFree?: number;
  isPro?: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  // Check if user has active subscription
  if (user.subscription?.status === "ACTIVE") {
    const now = new Date();
    if (user.subscription.currentPeriodEnd && user.subscription.currentPeriodEnd > now) {
      return { allowed: true, isPro: true };
    }
  }

  // Check free tier
  const freeLimit = PLANS.FREE.emailLimit;
  if (user.freeEmailsUsed < freeLimit) {
    return {
      allowed: true,
      isPro: false,
      remainingFree: freeLimit - user.freeEmailsUsed,
    };
  }

  return {
    allowed: false,
    reason: "Free limit reached. Please upgrade to Pro for unlimited emails.",
    remainingFree: 0,
    isPro: false,
  };
}

export async function incrementEmailUsage(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  // Only increment if user is on free plan
  if (!user?.subscription || user.subscription.status !== "ACTIVE") {
    await prisma.user.update({
      where: { id: userId },
      data: { freeEmailsUsed: { increment: 1 } },
    });
  }
}

export async function getSubscriptionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) return null;

  const isPro = user.subscription?.status === "ACTIVE" &&
    user.subscription.currentPeriodEnd &&
    user.subscription.currentPeriodEnd > new Date();

  return {
    isPro,
    freeEmailsUsed: user.freeEmailsUsed,
    freeEmailsRemaining: Math.max(0, PLANS.FREE.emailLimit - user.freeEmailsUsed),
    subscription: user.subscription,
  };
}
