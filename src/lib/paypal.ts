import { SubscriptionTier } from "@/types";

const PAYPAL_API =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PLAN_ENV_KEYS: Record<Exclude<SubscriptionTier, "free_trial" | "starter_free">, string> = {
  pro_scholar: "PAYPAL_PLAN_PRO_SCHOLAR",
  global_elite: "PAYPAL_PLAN_GLOBAL_ELITE",
  school: "PAYPAL_PLAN_SCHOOL",
  ministry: "PAYPAL_PLAN_MINISTRY",
  ngo: "PAYPAL_PLAN_NGO",
};

export function getPayPalPlanId(tier: SubscriptionTier): string | undefined {
  if (tier === "free_trial" || tier === "starter_free") return undefined;
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

  if (!res.ok) {
    const errorText = await res.text();
    const env = process.env.PAYPAL_ENV === "sandbox" ? "SANDBOX" : "LIVE";
    throw new Error(`PayPal auth failed (Status: ${res.status}, Env: ${env}). Please check your Client ID and Secret. Details: ${errorText}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function createPayPalProduct() {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "ExamCoach Subscription",
      description: "Access to ExamCoach study methods and AI tools",
      type: "SERVICE",
      category: "EDUCATIONAL_AND_TEXTBOOKS",
      image_url: "https://examcoach-rorw.onrender.com/icons/icon-192x192.png",
      home_url: "https://examcoach-rorw.onrender.com",
    }),
  });

  if (!res.ok) throw new Error("Failed to create PayPal product");
  return (await res.json()) as { id: string };
}

export async function createPayPalPlan(productId: string, tierName: string, amount: number) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      name: `ExamCoach ${tierName}`,
      description: `Monthly subscription for ExamCoach ${tierName}`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: amount.toFixed(2),
              currency_code: "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "0",
          currency_code: "USD",
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!res.ok) throw new Error(`Failed to create PayPal plan for ${tierName}: ${await res.text()}`);
  return (await res.json()) as { id: string };
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
