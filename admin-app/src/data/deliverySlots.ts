export interface DeliveryDayOption {
  id: "today" | "tomorrow";
  label: string;
  dateLabel: string;
  dateValue: string;
  available: boolean;
}

export interface DeliverySlot {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
}

export interface AvailableDeliverySlot
  extends DeliverySlot {
  available: boolean;
  reason?: string;
}

export const DELIVERY_SLOTS: DeliverySlot[] = [
  {
    id: "08-10",
    label: "8:00 AM – 10:00 AM",
    startHour: 8,
    endHour: 10,
  },
  {
    id: "10-12",
    label: "10:00 AM – 12:00 PM",
    startHour: 10,
    endHour: 12,
  },
  {
    id: "12-14",
    label: "12:00 PM – 2:00 PM",
    startHour: 12,
    endHour: 14,
  },
  {
    id: "14-16",
    label: "2:00 PM – 4:00 PM",
    startHour: 14,
    endHour: 16,
  },
  {
    id: "16-18",
    label: "4:00 PM – 6:00 PM",
    startHour: 16,
    endHour: 18,
  },
  {
    id: "18-20",
    label: "6:00 PM – 8:00 PM",
    startHour: 18,
    endHour: 20,
  },
];

const STORE_OPEN_HOUR = 10;
const STORE_CLOSE_HOUR = 20;
const PREPARATION_BUFFER_MINUTES = 45;

function formatDateValue(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

function getTomorrowDate(now: Date): Date {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return tomorrow;
}

export function getDeliveryDays(
  now = new Date(),
): DeliveryDayOption[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = getTomorrowDate(now);

  const currentHour = now.getHours();

  const todayAvailable =
    currentHour < STORE_CLOSE_HOUR;

  return [
    {
      id: "today",
      label: "Today",
      dateLabel: formatDateLabel(today),
      dateValue: formatDateValue(today),
      available: todayAvailable,
    },
    {
      id: "tomorrow",
      label: "Tomorrow",
      dateLabel: formatDateLabel(tomorrow),
      dateValue: formatDateValue(tomorrow),
      available: true,
    },
  ];
}

function getSlotStartDate(
  selectedDay: "today" | "tomorrow",
  slot: DeliverySlot,
  now: Date,
): Date {
  const slotDate =
    selectedDay === "today"
      ? new Date(now)
      : getTomorrowDate(now);

  slotDate.setHours(
    slot.startHour,
    0,
    0,
    0,
  );

  return slotDate;
}

export function getAvailableDeliverySlots(
  selectedDay: "today" | "tomorrow",
  now = new Date(),
): AvailableDeliverySlot[] {
  return DELIVERY_SLOTS.map((slot) => {
    if (slot.startHour < STORE_OPEN_HOUR) {
      return {
        ...slot,
        available: false,
        reason: "Store is closed during this slot.",
      };
    }

    if (slot.endHour > STORE_CLOSE_HOUR) {
      return {
        ...slot,
        available: false,
        reason: "Slot is outside store hours.",
      };
    }

    if (selectedDay === "tomorrow") {
      return {
        ...slot,
        available: true,
      };
    }

    const slotStartDate = getSlotStartDate(
      selectedDay,
      slot,
      now,
    );

    const earliestAllowedTime =
      new Date(
        now.getTime() +
          PREPARATION_BUFFER_MINUTES *
            60 *
            1000,
      );

    if (
      slotStartDate.getTime() <=
      earliestAllowedTime.getTime()
    ) {
      return {
        ...slot,
        available: false,
        reason: "This slot is no longer available.",
      };
    }

    return {
      ...slot,
      available: true,
    };
  });
}

export function getFirstAvailableSlot(
  selectedDay: "today" | "tomorrow",
  now = new Date(),
): AvailableDeliverySlot | null {
  return (
    getAvailableDeliverySlots(
      selectedDay,
      now,
    ).find((slot) => slot.available) ??
    null
  );
}

export function getDefaultDeliverySelection(
  now = new Date(),
): {
  day: "today" | "tomorrow";
  slotId: string;
} {
  const todaySlot = getFirstAvailableSlot(
    "today",
    now,
  );

  if (todaySlot) {
    return {
      day: "today",
      slotId: todaySlot.id,
    };
  }

  const tomorrowSlot =
    getFirstAvailableSlot(
      "tomorrow",
      now,
    );

  return {
    day: "tomorrow",
    slotId:
      tomorrowSlot?.id ??
      DELIVERY_SLOTS[0].id,
  };
}

export function getDeliverySelectionLabel(
  day: "today" | "tomorrow",
  slotId: string,
  now = new Date(),
): {
  dayLabel: string;
  dateLabel: string;
  slotLabel: string;
} {
  const dayOption = getDeliveryDays(
    now,
  ).find((item) => item.id === day);

  const slot = DELIVERY_SLOTS.find(
    (item) => item.id === slotId,
  );

  return {
    dayLabel:
      dayOption?.label ??
      (day === "today"
        ? "Today"
        : "Tomorrow"),

    dateLabel:
      dayOption?.dateLabel ?? "",

    slotLabel:
      slot?.label ??
      "Delivery slot not selected",
  };
}