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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  // Admin bypass: purpleteddy002@gmail.com gets unlimited access and is not billed
  if (user?.email?.toLowerCase() === "purpleteddy002@gmail.com") {
    return "global_elite";
  }

  const subscription = await getActiveSubscription(userId);
  if (!subscription) return "starter_free";

  if (
    subscription.tier === "starter_free" &&
    subscription.trialEndDate &&
    subscription.trialEndDate < new Date()
  ) {
    return "starter_free";
  }
  return subscription.tier as SubscriptionTier;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      email: true,
      orgId: true,
      organization: true
    },
  });

  // Admin bypass
  if (user?.email?.toLowerCase() === "purpleteddy002@gmail.com") {
    const plan = getPlanByTier("global_elite");
    return {
      tier: "global_elite",
      status: "active",
      isTrial: false,
      trialDaysLeft: 0,
      currentPeriodEnd: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      seats: 1,
      maxSeats: plan.maxSeats,
      limits: plan.limits,
      studyMethods: plan.studyMethods,
      dashboard: plan.dashboard,
    };
  }

  // Organization override
  if (user?.orgId && user.organization) {
    const org = user.organization;
    const plan = getPlanByTier("pro_scholar"); // Default base for org users
    return {
      tier: "pro_scholar",
      status: "active",
      isTrial: false,
      trialDaysLeft: 0,
      currentPeriodEnd: null,
      seats: 1,
      maxSeats: org.seatLimit,
      limits: {
        dailyUploads: org.dailyUploadsLimit,
        maxFileSizeMb: org.maxFileSizeMb,
        maxMockExamQuestions: org.maxMockExamQuestions,
        groqTokensLimit: org.groqTokensLimit,
        priorityAiProcessing: org.priorityAiProcessing,
      },
      studyMethods: [
        "flashcards", "active_recall", "pomodoro", "feynman", "spaced_repetition", 
        "mock_exam", "cornell_notes", "blurting", "mind_map", "interleaving", 
        "past_paper_drill", "exam_blueprint", "peer_teaching", "cohort_analytics"
      ],
      dashboard: plan.dashboard,
    };
  }

  const subscription = await getActiveSubscription(userId);
  const tier = (subscription?.tier ?? "starter_free") as SubscriptionTier;
  const plan = getPlanByTier(tier);

  const trialDaysLeft =
    subscription?.trialEndDate && tier === "starter_free"
      ? Math.max(0, daysBetween(new Date(), subscription.trialEndDate))
      : 0;

  return {
    tier,
    status: subscription?.status ?? "expired",
    isTrial: tier === "starter_free",
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true }
  });

  let limits: TierLimits;
  let tier: SubscriptionTier;

  if (user?.orgId && user.organization) {
    tier = "pro_scholar";
    limits = {
      dailyUploads: user.organization.dailyUploadsLimit,
      maxFileSizeMb: user.organization.maxFileSizeMb,
      maxMockExamQuestions: user.organization.maxMockExamQuestions,
      groqTokensLimit: user.organization.groqTokensLimit,
      priorityAiProcessing: user.organization.priorityAiProcessing,
    };
  } else {
    tier = await getUserTier(userId);
    limits = getTierLimits(tier);
  }

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
 * Claims one upload slot for today.
 */
export async function reserveUploadSlot(userId: string): Promise<UploadQuota> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true }
  });

  let limits: TierLimits;
  let tier: SubscriptionTier;

  if (user?.orgId && user.organization) {
    tier = "pro_scholar";
    limits = {
      dailyUploads: user.organization.dailyUploadsLimit,
      maxFileSizeMb: user.organization.maxFileSizeMb,
      maxMockExamQuestions: user.organization.maxMockExamQuestions,
      groqTokensLimit: user.organization.groqTokensLimit,
      priorityAiProcessing: user.organization.priorityAiProcessing,
    };
  } else {
    tier = await getUserTier(userId);
    limits = getTierLimits(tier);
  }

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
