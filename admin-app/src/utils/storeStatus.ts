import { BRAND } from "@/src/config/brand";

export interface StoreStatus {
  isOpen: boolean;
  label: string;
  helper: string;
}

// Compute store open/closed based on current hours vs BRAND.storeHours.
export const getStoreStatus = (now: Date = new Date()): StoreStatus => {
  const hour = now.getHours();
  const min = now.getMinutes();
  const { open, close, displayText } = BRAND.storeHours;
  const isOpen = hour >= open && (hour < close || (hour === close && min === 0));

  if (isOpen) {
    return {
      isOpen: true,
      label: "Open Now",
      helper: `Closes at ${formatHour(close)}`,
    };
  }
  return {
    isOpen: false,
    label: "Closed",
    helper: `Opens at ${formatHour(open)} · ${displayText}`,
  };
};

const formatHour = (h: number): string => {
  const ampm = h >= 12 ? "PM" : "AM";
  const disp = h % 12 || 12;
  return `${disp}:00 ${ampm}`;
};
