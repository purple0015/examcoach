import crypto from "crypto";

export interface PaynowPayment {
  amount: number;
  email: string;
  reference: string;
  items?: string;
}

/**
 * Generates a SHA512 hash for Paynow integration
 */
export function generatePaynowHash(data: Record<string, string>, integrationKey: string): string {
  const values = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map((key) => data[key])
    .join("");
  
  return crypto
    .createHash("sha512")
    .update(values + integrationKey)
    .digest("hex")
    .toUpperCase();
}

/**
 * Initiates a transaction with Paynow
 */
export async function initiatePaynowPayment(payment: PaynowPayment) {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  const resultUrl = process.env.PAYNOW_RESULT_URL;
  const returnUrl = process.env.PAYNOW_RETURN_URL;

  if (!integrationId || !integrationKey) {
    throw new Error("Paynow integration credentials missing");
  }

  const data: Record<string, string> = {
    resulturl: resultUrl || "",
    returnurl: returnUrl || "",
    reference: payment.reference,
    amount: payment.amount.toFixed(2),
    id: integrationId,
    additionalinfo: payment.items ?? "ExamCoach Subscription",
    authemail: payment.email,
    status: "Message",
  };

  const hash = generatePaynowHash(data, integrationKey);
  data.hash = hash;

  const response = await fetch("https://www.paynow.co.zw/interface/initiatetransaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(data).toString(),
  });

  const responseText = await response.text();
  const params = new URLSearchParams(responseText);

  if (params.get("status")?.toLowerCase() === "error") {
    throw new Error(params.get("error") || "Paynow initiation failed");
  }

  return {
    browserUrl: params.get("browserurl"),
    pollUrl: params.get("pollurl"),
    hash: params.get("hash"),
  };
}

/**
 * Verifies the hash returned by Paynow
 */
export function verifyPaynowHash(data: Record<string, string>, integrationKey: string): boolean {
  const receivedHash = data.hash;
  if (!receivedHash) return false;
  
  const expectedHash = generatePaynowHash(data, integrationKey);
  return receivedHash.toUpperCase() === expectedHash.toUpperCase();
}
