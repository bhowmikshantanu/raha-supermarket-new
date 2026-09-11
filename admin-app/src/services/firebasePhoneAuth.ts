import {
  getAuth,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "@react-native-firebase/auth";

let pendingConfirmation: ConfirmationResult | null = null;
let pendingMobile = "";

function normalizeIndianMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  throw new Error("Enter a valid 10-digit Indian mobile number.");
}

export async function sendPhoneOtp(
  mobile: string,
): Promise<void> {
  const phoneNumber = normalizeIndianMobile(mobile);

  const auth = getAuth();

  pendingConfirmation =
    await signInWithPhoneNumber(
      auth,
      phoneNumber,
    );

  pendingMobile = mobile.replace(/\D/g, "");
}

export async function verifyPhoneOtp(
  code: string,
): Promise<void> {
  if (!pendingConfirmation) {
    throw new Error(
      "OTP session expired. Please request a new OTP.",
    );
  }

  await pendingConfirmation.confirm(code);

  pendingConfirmation = null;
}

export function getPendingOtpMobile(): string {
  return pendingMobile;
}

export function clearPendingOtp(): void {
  pendingConfirmation = null;
  pendingMobile = "";
}

export function getPhoneAuthErrorMessage(
  error: unknown,
): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error
      ? String(
          (error as { code?: unknown }).code ?? "",
        )
      : "";

  if (
    code.includes("invalid-phone-number")
  ) {
    return "Enter a valid mobile number.";
  }

  if (
    code.includes("too-many-requests")
  ) {
    return "Too many OTP requests. Please try again later.";
  }

  if (
    code.includes("quota-exceeded")
  ) {
    return "OTP service quota exceeded. Please try again later.";
  }

  if (
    code.includes("invalid-verification-code")
  ) {
    return "Incorrect OTP. Please check and try again.";
  }

  if (
    code.includes("session-expired")
  ) {
    return "OTP expired. Please request a new OTP.";
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Unable to verify OTP. Please try again.";
}
