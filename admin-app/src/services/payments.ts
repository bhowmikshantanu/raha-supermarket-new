/**
 * Razorpay client-side API helpers.
 *
 * The backend (FastAPI on Railway) owns the Razorpay Key Secret and creates
 * every order + verifies every payment signature. The client only ever
 * receives the public Key ID (returned by create-order). No secret is ever
 * stored or referenced on the client.
 */

const RAW_BASE_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || ""
).trim().replace(/\/+$/, "");

const API_BASE = `${RAW_BASE_URL}/api`;

export type CreatedRazorpayOrder = {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
};

export type VerifyRazorpayPaymentInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

/**
 * Ask the backend to create a Razorpay order for the given INR amount.
 * The amount is sent in rupees; the backend converts to paise and is the
 * authoritative source of the charged amount.
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  receiptId?: string,
): Promise<CreatedRazorpayOrder> {
  const response = await fetch(`${API_BASE}/payments/razorpay/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amountInRupees),
      currency: "INR",
      receipt: receiptId,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || "Unable to start the online payment. Please try again.",
    );
  }

  const data = await response.json();

  return {
    orderId: String(data.order_id),
    amount: Number(data.amount),
    currency: String(data.currency || "INR"),
    keyId: String(data.key_id),
  };
}

/**
 * Ask the backend to verify the Razorpay payment signature. Returns true only
 * when the server confirms the HMAC signature is valid.
 */
export async function verifyRazorpayPayment(
  input: VerifyRazorpayPaymentInput,
): Promise<boolean> {
  const response = await fetch(`${API_BASE}/payments/razorpay/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: input.razorpayOrderId,
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_signature: input.razorpaySignature,
    }),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json().catch(() => null);
  return Boolean(data?.verified);
}
