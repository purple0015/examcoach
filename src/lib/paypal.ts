import { SubscriptionTier } from "@/types";

const PAYPAL_API =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PLAN_ENV_KEYS: Record<Exclude<SubscriptionTier, "free_trial">, string> = {
  individual: "PAYPAL_PLAN_INDIVIDUAL",
  family: "PAYPAL_PLAN_FAMILY",
  school: "PAYPAL_PLAN_SCHOOL",
  ministry: "PAYPAL_PLAN_MINISTRY",
  ngo: "PAYPAL_PLAN_NGO",
};

export function getPayPalPlanId(tier: SubscriptionTier): string | undefined {
  if (tier === "free_trial") return undefined;
  return process.env[PLAN_ENV_KEYS[tier]];
}

export function tierForPayPalPlanId(planId: string | undefined): SubscriptionTier | undefined {
  if (!planId) return undefined;
  const entry = Object.entries(PLAN_ENV_KEYS).find(([, envKey]) => process.env[envKey] === planId);
  return entry?.[0] as SubscriptionTier | undefined;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal credentials are not configured");

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface PayPalSubscriptionResponse {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
}

export async function createPayPalSubscription(
  planId: string,
  subscriberEmail: string,
  returnUrl: string,
  cancelUrl: string
): Promise<PayPalSubscriptionResponse> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      subscriber: { email_address: subscriberEmail },
      application_context: {
        brand_name: "ExamCoach",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal subscription failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as PayPalSubscriptionResponse;
}

export async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
    cache: "no-store",
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
