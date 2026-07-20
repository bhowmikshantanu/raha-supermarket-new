import { BRAND } from "@/src/config/brand";

// Indian rupee formatting — uses locale grouping (₹1,50,000).
export const formatCurrency = (amount: number): string => {
  const rounded = Math.round(amount);
  return `${BRAND.currency.symbol}${rounded.toLocaleString("en-IN")}`;
};

export const calcDiscountPercent = (mrp: number, price: number): number => {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

// Format Indian mobile number for display: 8130011378 -> 81300 11378
export const formatMobile = (mobile: string): string => {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length !== 10) return mobile;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

export const isValidIndianMobile = (mobile: string): boolean => {
  const digits = mobile.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(digits);
};

export const isValidPincode = (pin: string): boolean =>
  /^[1-9]\d{5}$/.test(pin.trim());

// Human friendly date/time: "12 Feb, 3:24 PM"
export const formatDateTime = (epoch: number): string => {
  const d = new Date(epoch);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
};
