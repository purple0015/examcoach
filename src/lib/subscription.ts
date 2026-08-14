import { prisma } from "@/lib/db";
import { getPlanByTier, getTierLimits } from "@/lib/plans";
import { daysBetween } from "@/lib/utils";
import { SubscriptionStatus, SubscriptionTier, TierLimits, UploadQuota } from "@/types";

export { getTierLimits };

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return "free_trial";

  if (
    subscription.tier === "free_trial" &&
    subscription.trialEndDate &&
    subscription.trialEndDate < new Date()
  ) {
    return "free_trial";
  }
  return subscription.tier as SubscriptionTier;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const subscription = await getActiveSubscription(userId);
  const tier = (subscription?.tier ?? "free_trial") as SubscriptionTier;
  const plan = getPlanByTier(tier);

  const trialDaysLeft =
    subscription?.trialEndDate && tier === "free_trial"
      ? Math.max(0, daysBetween(new Date(), subscription.trialEndDate))
      : 0;

  return {
    tier,
    status: subscription?.status ?? "expired",
    isTrial: tier === "free_trial",
    trialDaysLeft,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    seats: subscription?.seats ?? 1,
    maxSeats: subscription?.maxSeats ?? plan.maxSeats,
    limits: plan.limits,
    studyMethods: plan.studyMethods,
    dashboard: plan.dashboard,
  };
}

async function uploadsToday(userId: string): Promise<number> {
  const record = await prisma.dailyUpload.findUnique({
    where: { userId_date: { userId, date: startOfUtcDay() } },
  });
  return record?.count ?? 0;
}

export async function getUploadQuota(userId: string): Promise<UploadQuota> {
  const tier = await getUserTier(userId);
  const limits: TierLimits = getTierLimits(tier);
  const used = await uploadsToday(userId);

  return {
    canUpload: used < limits.dailyUploads,
    uploadsToday: used,
    maxUploads: limits.dailyUploads,
    uploadsRemaining: Math.max(0, limits.dailyUploads - used),
    maxFileSizeMb: limits.maxFileSizeMb,
    tier,
  };
}

/**
 * Claims one upload slot for today. The counter is incremented first so that
 * concurrent requests cannot both pass a read-then-write quota check; the slot
 * is released again when the increment pushed the user past their plan limit.
 */
export async function reserveUploadSlot(userId: string): Promise<UploadQuota> {
  const tier = await getUserTier(userId);
  const limits: TierLimits = getTierLimits(tier);
  const date = startOfUtcDay();

  const record = await prisma.dailyUpload.upsert({
    where: { userId_date: { userId, date } },
    update: { count: { increment: 1 } },
    create: { userId, date, count: 1 },
  });

  if (record.count > limits.dailyUploads) {
    await releaseUploadSlot(userId);
    return {
      canUpload: false,
      uploadsToday: limits.dailyUploads,
      maxUploads: limits.dailyUploads,
      uploadsRemaining: 0,
      maxFileSizeMb: limits.maxFileSizeMb,
      tier,
    };
  }

  return {
    canUpload: true,
    uploadsToday: record.count,
    maxUploads: limits.dailyUploads,
    uploadsRemaining: Math.max(0, limits.dailyUploads - record.count),
    maxFileSizeMb: limits.maxFileSizeMb,
    tier,
  };
}

export async function releaseUploadSlot(userId: string): Promise<void> {
  const date = startOfUtcDay();
  await prisma.dailyUpload.updateMany({
    where: { userId, date, count: { gt: 0 } },
    data: { count: { decrement: 1 } },
  });
}
