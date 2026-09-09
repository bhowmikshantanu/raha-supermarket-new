import { Platform } from "react-native";

import type { CreatedRazorpayOrder } from "@/src/services/payments";

export type RazorpayCheckoutResult = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export class RazorpayCancelledError extends Error {
  constructor(message = "Payment cancelled.") {
    super(message);
    this.name = "RazorpayCancelledError";
  }
}

type CheckoutPrefill = {
  name?: string;
  email?: string;
  contact?: string;
};

const STORE_NAME = "Raha Supermarket";
const THEME_COLOR = "#7A1F3D";

function loadWebScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const globalWindow = window as unknown as { Razorpay?: unknown };
    if (globalWindow.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Unable to load the Razorpay checkout."));
    document.body.appendChild(script);
  });
}

async function openWebCheckout(
  order: CreatedRazorpayOrder,
  prefill: CheckoutPrefill,
): Promise<RazorpayCheckoutResult> {
  await loadWebScript("https://checkout.razorpay.com/v1/checkout.js");

  const globalWindow = window as unknown as {
    Razorpay?: new (options: unknown) => { open: () => void };
  };

  const RazorpayConstructor = globalWindow.Razorpay;
  if (!RazorpayConstructor) {
    throw new Error("Razorpay checkout is unavailable.");
  }

  return new Promise<RazorpayCheckoutResult>((resolve, reject) => {
    const checkout = new RazorpayConstructor({
      key: order.keyId,
      amount: String(order.amount),
      currency: order.currency,
      name: STORE_NAME,
      description: "Grocery order payment",
      order_id: order.orderId,
      prefill: {
        name: prefill.name,
        email: prefill.email,
        contact: prefill.contact,
      },
      theme: { color: THEME_COLOR },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        resolve({
          razorpayOrderId: order.orderId,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new RazorpayCancelledError()),
      },
    });

    checkout.open();
  });
}

async function openNativeCheckout(
  order: CreatedRazorpayOrder,
  prefill: CheckoutPrefill,
): Promise<RazorpayCheckoutResult> {
  // Lazy require so web bundles never execute the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RazorpayCheckout = require("react-native-razorpay").default as {
    open: (options: unknown) => Promise<{
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }>;
  };

  try {
    const result = await RazorpayCheckout.open({
      key: order.keyId,
      amount: String(order.amount),
      currency: order.currency,
      name: STORE_NAME,
      description: "Grocery order payment",
      order_id: order.orderId,
      prefill: {
        name: prefill.name,
        email: prefill.email,
        contact: prefill.contact,
      },
      theme: { color: THEME_COLOR },
    });

    return {
      razorpayOrderId: result.razorpay_order_id || order.orderId,
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
    };
  } catch (error) {
    // react-native-razorpay rejects with { code, description } on cancel.
    const description =
      error && typeof error === "object" && "description" in error
        ? String((error as { description?: string }).description)
        : "";

    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: number }).code
        : undefined;

    // code 0/2 = user cancelled / payment cancelled.
    if (code === 0 || code === 2 || /cancel/i.test(description)) {
      throw new RazorpayCancelledError(description || "Payment cancelled.");
    }

    throw new Error(description || "Payment failed. Please try again.");
  }
}

/**
 * Opens the Razorpay checkout using the correct implementation for the
 * current platform and resolves with the fields the backend needs to verify.
 * Throws RazorpayCancelledError when the user dismisses the sheet.
 */
export async function openRazorpayCheckout(
  order: CreatedRazorpayOrder,
  prefill: CheckoutPrefill,
): Promise<RazorpayCheckoutResult> {
  if (Platform.OS === "web") {
    return openWebCheckout(order, prefill);
  }
  return openNativeCheckout(order, prefill);
}
