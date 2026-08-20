import crypto from "crypto";

export interface PaynowPayment {
  amount: number;
  email: string;
  reference: string;
  items?: string;
}

/**
 * Generates a SHA512 hash for Paynow integration.
 * Paynow requires fields to be concatenated in a specific order, NOT alphabetical.
 */
export function generatePaynowHash(data: Record<string, string>, integrationKey: string): string {
  // Define the expected field order for different scenarios
  const initiationFields = ["resulturl", "returnurl", "reference", "amount", "id", "additionalinfo", "authemail", "tokenize", "status"];
  const responseFields = ["reference", "amount", "paynowreference", "status", "pollurl"];
  const initiateResponseFields = ["status", "browserurl", "pollurl"];

  let values = "";
  
  // Determine which field set to use based on the presence of keys
  if (data.resulturl || data.returnurl) {
    // Initiation Request
    initiationFields.forEach(field => {
      if (data[field] !== undefined) {
        values += data[field];
      }
    });
  } else if (data.paynowreference) {
    // Status/Poll/Webhook Response
    responseFields.forEach(field => {
      if (data[field] !== undefined) {
        values += data[field];
      }
    });
  } else if (data.browserurl && data.pollurl) {
    // Initiate Response (from Paynow to us)
    initiateResponseFields.forEach(field => {
      if (data[field] !== undefined) {
        values += data[field];
      }
    });
  } else {
    // Fallback: use keys in provided order (excluding hash)
    Object.keys(data).forEach(key => {
      if (key !== 'hash') {
        values += data[key];
      }
    });
  }
  
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
    tokenize: "False", // Default to False
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
  const responseData: Record<string, string> = {};
  params.forEach((value, key) => {
    responseData[key] = value;
  });

  if (responseData.status?.toLowerCase() === "error") {
    throw new Error(responseData.error || "Paynow initiation failed");
  }

  // Verify response hash
  if (!verifyPaynowHash(responseData, integrationKey)) {
    throw new Error("Invalid hash from Paynow initiation response");
  }

  return {
    browserUrl: responseData.browserurl,
    pollUrl: responseData.pollurl,
    hash: responseData.hash,
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
