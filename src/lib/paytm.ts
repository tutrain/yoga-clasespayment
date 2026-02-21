// @ts-expect-error - paytmchecksum doesn't have type declarations
import PaytmChecksum from "paytmchecksum";

const PAYTM_MID = process.env.PAYTM_MID!;
const PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY!;
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || "DEFAULT";
const PAYTM_ENVIRONMENT = process.env.PAYTM_ENVIRONMENT || "production";

// Paytm API host based on environment
export function getPaytmHost(): string {
  return PAYTM_ENVIRONMENT === "production"
    ? "https://securegw.paytm.in"
    : "https://securegw-stage.paytm.in";
}

/**
 * Initiate a Paytm transaction and get a transaction token.
 */
export async function initiateTransaction(
  orderId: string,
  amount: number,
  customerId: string,
  callbackUrl: string
): Promise<{ txnToken: string; orderId: string } | null> {
  const paytmHost = getPaytmHost();

  const body = {
    requestType: "Payment",
    mid: PAYTM_MID,
    websiteName: PAYTM_WEBSITE,
    orderId: orderId,
    callbackUrl: callbackUrl,
    txnAmount: {
      value: amount.toFixed(2),
      currency: "INR",
    },
    userInfo: {
      custId: customerId,
    },
  };

  // Generate checksum for the body
  const checksum = await PaytmChecksum.generateSignature(
    JSON.stringify(body),
    PAYTM_MERCHANT_KEY
  );

  const paytmParams = {
    body: body,
    head: {
      signature: checksum,
    },
  };

  // Call Paytm's Initiate Transaction API
  const url = `${paytmHost}/theia/api/v1/initiateTransaction?mid=${PAYTM_MID}&orderId=${orderId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paytmParams),
  });

  const data = await response.json();

  if (data.body?.resultInfo?.resultStatus === "S") {
    return {
      txnToken: data.body.txnToken,
      orderId: orderId,
    };
  }

  console.error("Paytm initiate transaction failed:", data);
  return null;
}

/**
 * Verify the Paytm checksum from callback/response data.
 */
export async function verifyChecksum(
  params: Record<string, string>
): Promise<boolean> {
  const paytmChecksum = params.CHECKSUMHASH;
  const isValid = await PaytmChecksum.verifySignature(
    params,
    PAYTM_MERCHANT_KEY,
    paytmChecksum
  );
  return isValid;
}

/**
 * Verify transaction status with Paytm's Order Status API.
 */
export async function verifyTransactionStatus(
  orderId: string
): Promise<{
  status: "TXN_SUCCESS" | "TXN_FAILURE" | "PENDING" | string;
  txnId: string;
  txnAmount: string;
  bankTxnId: string;
}> {
  const paytmHost = getPaytmHost();

  const paytmParams = {
    body: {
      mid: PAYTM_MID,
      orderId: orderId,
    },
    head: {
      signature: "",
    },
  };

  const checksum = await PaytmChecksum.generateSignature(
    JSON.stringify(paytmParams.body),
    PAYTM_MERCHANT_KEY
  );

  paytmParams.head.signature = checksum;

  const url = `${paytmHost}/v3/order/status`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paytmParams),
  });

  const data = await response.json();

  return {
    status: data.body?.resultInfo?.resultStatus || "UNKNOWN",
    txnId: data.body?.txnId || "",
    txnAmount: data.body?.txnAmount || "",
    bankTxnId: data.body?.bankTxnId || "",
  };
}

/**
 * Get Paytm transaction page URL for redirect.
 */
export function getPaytmRedirectUrl(orderId: string, txnToken: string): string {
  const paytmHost = getPaytmHost();
  return `${paytmHost}/theia/api/v1/showPaymentPage?mid=${PAYTM_MID}&orderId=${orderId}`;
}

/**
 * Build the Paytm form parameters for redirect.
 */
export function buildPaytmFormParams(orderId: string, txnToken: string): Record<string, string> {
  return {
    mid: PAYTM_MID,
    orderId: orderId,
    txnToken: txnToken,
  };
}
