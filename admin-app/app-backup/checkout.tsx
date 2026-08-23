import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { FreeDeliveryProgress } from "@/src/components/FreeDeliveryProgress";
import { Input } from "@/src/components/Input";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { useToast } from "@/src/components/Toast";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import {
  getAvailableCoupons,
  validateCoupon,
  type Coupon,
} from "@/src/data/coupons";
import {
  getAvailableDeliverySlots,
  getDefaultDeliverySelection,
  getDeliveryDays,
  getDeliverySelectionLabel,
} from "@/src/data/deliverySlots";
import { getProductById } from "@/src/data/products";
import {
  formatCurrency,
  isValidIndianMobile,
  isValidPincode,
} from "@/src/utils/format";

interface FormState {
  fullName: string;
  mobile: string;
  house: string;
  landmark: string;
  area: string;
  pincode: string;
  instructions: string;
}

type Errors = Partial<Record<keyof FormState, string>>;
type PaymentMethod = "cod" | "online";
type DeliveryDay = "today" | "tomorrow";

export default function Checkout() {
  const router = useRouter();
  const { showToast } = useToast();

  const {
    cart,
    cartSubtotal,
    deliveryFee,
    placeOrder,
    addAddress,
    defaultAddress,
    user,
  } = useApp();

  const [form, setForm] = useState<FormState>({
    fullName: defaultAddress?.fullName ?? user?.name ?? "",
    mobile: defaultAddress?.mobile ?? user?.mobile ?? "",
    house: defaultAddress?.house ?? "",
    landmark: defaultAddress?.landmark ?? "",
    area: defaultAddress?.area ?? "",
    pincode: defaultAddress?.pincode ?? "",
    instructions: defaultAddress?.instructions ?? "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [saveAddress, setSaveAddress] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [deliveryDiscount, setDeliveryDiscount] = useState(0);

  const defaultDeliverySelection = useMemo(
    () => getDefaultDeliverySelection(),
    [],
  );

  const [selectedDeliveryDay, setSelectedDeliveryDay] =
    useState<DeliveryDay>(
      defaultDeliverySelection.day,
    );

  const [selectedDeliverySlotId, setSelectedDeliverySlotId] =
    useState(defaultDeliverySelection.slotId);

  const availableCoupons = useMemo(
    () => getAvailableCoupons(cartSubtotal),
    [cartSubtotal],
  );

  const deliveryDays = useMemo(
    () => getDeliveryDays(),
    [],
  );

  const availableDeliverySlots = useMemo(
    () =>
      getAvailableDeliverySlots(
        selectedDeliveryDay,
      ),
    [selectedDeliveryDay],
  );

  const selectedDeliveryDetails = useMemo(
    () =>
      getDeliverySelectionLabel(
        selectedDeliveryDay,
        selectedDeliverySlotId,
      ),
    [
      selectedDeliveryDay,
      selectedDeliverySlotId,
    ],
  );

  const selectedDeliverySlot = useMemo(
    () =>
      availableDeliverySlots.find(
        (slot) =>
          slot.id ===
          selectedDeliverySlotId,
      ) ?? null,
    [
      availableDeliverySlots,
      selectedDeliverySlotId,
    ],
  );

  const finalDeliveryFee = Math.max(
    0,
    deliveryFee - deliveryDiscount,
  );

  const finalTotal = Math.max(
    0,
    cartSubtotal +
      finalDeliveryFee -
      couponDiscount,
  );

  const setField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: undefined,
    }));
  };

  useEffect(() => {
    if (!appliedCoupon) {
      return;
    }

    const result = validateCoupon(
      appliedCoupon.code,
      cartSubtotal,
      deliveryFee,
    );

    if (!result.ok) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setDeliveryDiscount(0);
      return;
    }

    setCouponDiscount(result.discount);
    setDeliveryDiscount(result.deliveryDiscount);
  }, [appliedCoupon, cartSubtotal, deliveryFee]);

  useEffect(() => {
    const currentSlot =
      availableDeliverySlots.find(
        (slot) =>
          slot.id ===
          selectedDeliverySlotId,
      );

    if (currentSlot?.available) {
      return;
    }

    const firstAvailable =
      availableDeliverySlots.find(
        (slot) => slot.available,
      );

    if (firstAvailable) {
      setSelectedDeliverySlotId(
        firstAvailable.id,
      );
      return;
    }

    if (selectedDeliveryDay === "today") {
      const tomorrowSlots =
        getAvailableDeliverySlots(
          "tomorrow",
        );

      const firstTomorrowSlot =
        tomorrowSlots.find(
          (slot) => slot.available,
        );

      if (firstTomorrowSlot) {
        setSelectedDeliveryDay(
          "tomorrow",
        );
        setSelectedDeliverySlotId(
          firstTomorrowSlot.id,
        );
      }
    }
  }, [
    availableDeliverySlots,
    selectedDeliveryDay,
    selectedDeliverySlotId,
  ]);

  const handleApplyCoupon = (codeOverride?: string) => {
    const codeToApply = codeOverride ?? couponCode;

    const result = validateCoupon(
      codeToApply,
      cartSubtotal,
      deliveryFee,
    );

    if (!result.ok || !result.coupon) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setDeliveryDiscount(0);
      showToast(result.message, "error");
      return;
    }

    setCouponCode(result.coupon.code);
    setAppliedCoupon(result.coupon);
    setCouponDiscount(result.discount);
    setDeliveryDiscount(result.deliveryDiscount);
    showToast(result.message, "success");
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setDeliveryDiscount(0);
    showToast("Coupon removed.", "info");
  };

  const handleDeliveryDayChange = (
    day: DeliveryDay,
  ) => {
    const dayOption = deliveryDays.find(
      (item) => item.id === day,
    );

    if (!dayOption?.available) {
      showToast(
        "Today is no longer available. Please select tomorrow.",
        "info",
      );
      return;
    }

    setSelectedDeliveryDay(day);

    const firstAvailable =
      getAvailableDeliverySlots(
        day,
      ).find((slot) => slot.available);

    if (firstAvailable) {
      setSelectedDeliverySlotId(
        firstAvailable.id,
      );
    }
  };

  const handleDeliverySlotChange = (
    slotId: string,
  ) => {
    const slot =
      availableDeliverySlots.find(
        (item) => item.id === slotId,
      );

    if (!slot?.available) {
      showToast(
        slot?.reason ??
          "This delivery slot is unavailable.",
        "info",
      );
      return;
    }

    setSelectedDeliverySlotId(slotId);
  };

  const validate = (): boolean => {
    const nextErrors: Errors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Name is required";
    }

    if (!isValidIndianMobile(form.mobile.trim())) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number";
    }

    if (!form.house.trim()) {
      nextErrors.house = "House / flat is required";
    }

    if (!form.area.trim()) {
      nextErrors.area = "Area is required";
    }

    if (!isValidPincode(form.pincode.trim())) {
      nextErrors.pincode = "Enter a valid 6-digit pincode";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handlePlaceOrder = () => {
    if (placing) {
      return;
    }

    if (cart.length === 0) {
      showToast("Your cart is empty", "error");
      return;
    }

    if (payment === "online") {
      showToast(
        "Online payment will be enabled after payment gateway integration.",
        "info"
      );
      return;
    }

    if (
      !selectedDeliverySlot ||
      !selectedDeliverySlot.available
    ) {
      showToast(
        "Please select an available delivery slot.",
        "error",
      );
      return;
    }

    if (!validate()) {
      showToast("Please fix the highlighted fields", "error");
      return;
    }

    const address = {
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      house: form.house.trim(),
      landmark: form.landmark.trim(),
      area: form.area.trim(),
      pincode: form.pincode.trim(),
      instructions: form.instructions.trim(),
    };

    setPlacing(true);

    setTimeout(() => {
      try {
        /*
         * IMPORTANT:
         * Order is created before saving the address.
         * This prevents addAddress state updates from interrupting
         * the order-placement and navigation flow.
         */
        const order = placeOrder(
          {
            id: `checkout-address-${Date.now()}`,
            ...address,
          },
          payment
        );

        if (!order) {
          setPlacing(false);
          showToast("Failed to place order. Please try again.", "error");
          return;
        }

        Object.assign(order, {
          deliveryFee: finalDeliveryFee,
          total: finalTotal,
          couponCode: appliedCoupon?.code,
          couponDiscount,
          deliveryDiscount,
          deliveryDay: selectedDeliveryDay,
          deliveryDateLabel:
            selectedDeliveryDetails.dateLabel,
          deliverySlotId:
            selectedDeliverySlotId,
          deliverySlotLabel:
            selectedDeliveryDetails.slotLabel,
        });

        const orderId = order.id;

        setPlacing(false);

        /*
         * Navigate immediately after successful order creation.
         */
        router.replace({
          pathname: "/order-confirmation",
          params: {
            id: orderId,
          },
        });

        /*
         * Save the address separately.
         * Even if saving fails, the successfully placed order
         * and confirmation navigation will not be affected.
         */
        if (saveAddress) {
          setTimeout(() => {
            try {
              addAddress({
                ...address,
                isDefault: true,
              });
            } catch (addressError) {
              console.error("Address save error:", addressError);
            }
          }, 100);
        }
      } catch (error) {
        console.error("Order placement error:", error);
        setPlacing(false);

        showToast(
          "Something went wrong while placing your order.",
          "error"
        );
      }
    }, 700);
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["bottom"]}
    >
      <ScreenHeader title="Checkout" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FreeDeliveryProgress
            subtotal={cartSubtotal}
            compact
          />

          {/* Delivery address */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                Delivery Address
              </Text>

              <Text style={styles.sectionDescription}>
                Enter the address where you want your order delivered.
              </Text>
            </View>
          </View>

          <View style={styles.addressCard}>
            <Input
              label="Full Name"
              placeholder="Your name"
              value={form.fullName}
              onChangeText={(text) =>
                setField("fullName", text)
              }
              error={errors.fullName}
              leftIcon="person-outline"
              testID="in-fullname"
            />

            <Input
              label="Mobile Number"
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={form.mobile}
              onChangeText={(text) =>
                setField(
                  "mobile",
                  text.replace(/\D/g, "")
                )
              }
              error={errors.mobile}
              leftIcon="call-outline"
              testID="in-mobile"
            />

            <Input
              label="House / Flat / Building"
              placeholder="e.g. House No. 12, 2nd floor"
              value={form.house}
              onChangeText={(text) =>
                setField("house", text)
              }
              error={errors.house}
              leftIcon="home-outline"
              testID="in-house"
            />

            <Input
              label="Landmark (optional)"
              placeholder="Nearby landmark"
              value={form.landmark}
              onChangeText={(text) =>
                setField("landmark", text)
              }
              leftIcon="flag-outline"
              testID="in-landmark"
            />

            <Input
              label="Area / Colony"
              placeholder="e.g. Gularbhoj Road"
              value={form.area}
              onChangeText={(text) =>
                setField("area", text)
              }
              error={errors.area}
              leftIcon="map-outline"
              testID="in-area"
            />

            <Input
              label="Pincode"
              placeholder="6-digit pincode"
              keyboardType="number-pad"
              maxLength={6}
              value={form.pincode}
              onChangeText={(text) =>
                setField(
                  "pincode",
                  text.replace(/\D/g, "")
                )
              }
              error={errors.pincode}
              leftIcon="pin-outline"
              testID="in-pincode"
            />

            <Input
              label="Delivery Instructions (optional)"
              placeholder="e.g. Ring the bell twice"
              value={form.instructions}
              onChangeText={(text) =>
                setField("instructions", text)
              }
              multiline
              leftIcon="chatbubble-ellipses-outline"
              testID="in-instructions"
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() =>
                setSaveAddress((current) => !current)
              }
              activeOpacity={0.8}
              testID="save-address-toggle"
            >
              <View
                style={[
                  styles.checkbox,
                  saveAddress && styles.checkboxActive,
                ]}
              >
                {saveAddress && (
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color={COLORS.textOnPrimary}
                  />
                )}
              </View>

              <View style={styles.checkboxContent}>
                <Text style={styles.checkboxText}>
                  Save this address
                </Text>

                <Text style={styles.checkboxSubtext}>
                  Use this address for future orders.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Delivery information */}

          <View style={styles.deliveryCard}>
            <View style={styles.deliveryIcon}>
              <Ionicons
                name="bicycle-outline"
                size={23}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.deliveryContent}>
              <Text style={styles.deliveryTitle}>
                Local Delivery
              </Text>

              <Text style={styles.deliverySubtitle}>
                Delivery within the Raha Supermarket service area.
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={23}
              color={COLORS.primary}
            />
          </View>

          {/* Delivery slot */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                Delivery Slot
              </Text>

              <Text style={styles.sectionDescription}>
                Choose a convenient delivery day and time.
              </Text>
            </View>
          </View>

          <View style={styles.deliverySlotCard}>
            <View style={styles.deliveryDayRow}>
              {deliveryDays.map((day) => {
                const selected =
                  selectedDeliveryDay === day.id;

                return (
                  <TouchableOpacity
                    key={day.id}
                    activeOpacity={0.8}
                    disabled={!day.available}
                    onPress={() =>
                      handleDeliveryDayChange(
                        day.id,
                      )
                    }
                    style={[
                      styles.deliveryDayButton,
                      selected &&
                        styles.deliveryDayButtonSelected,
                      !day.available &&
                        styles.deliveryDayButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                      disabled: !day.available,
                    }}
                  >
                    <Text
                      style={[
                        styles.deliveryDayLabel,
                        selected &&
                          styles.deliveryDayLabelSelected,
                        !day.available &&
                          styles.deliveryDayLabelDisabled,
                      ]}
                    >
                      {day.label}
                    </Text>

                    <Text
                      style={[
                        styles.deliveryDateLabel,
                        selected &&
                          styles.deliveryDateLabelSelected,
                        !day.available &&
                          styles.deliveryDayLabelDisabled,
                      ]}
                    >
                      {day.dateLabel}
                    </Text>

                    {!day.available ? (
                      <Text
                        style={
                          styles.deliveryUnavailableText
                        }
                      >
                        Unavailable
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.slotDivider} />

            <Text style={styles.slotSectionLabel}>
              Available time slots
            </Text>

            <View style={styles.slotGrid}>
              {availableDeliverySlots.map(
                (slot) => {
                  const selected =
                    selectedDeliverySlotId ===
                    slot.id;

                  return (
                    <TouchableOpacity
                      key={slot.id}
                      activeOpacity={0.8}
                      disabled={!slot.available}
                      onPress={() =>
                        handleDeliverySlotChange(
                          slot.id,
                        )
                      }
                      style={[
                        styles.slotButton,
                        selected &&
                          styles.slotButtonSelected,
                        !slot.available &&
                          styles.slotButtonDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected,
                        disabled:
                          !slot.available,
                      }}
                    >
                      <View
                        style={
                          styles.slotButtonTopRow
                        }
                      >
                        <Ionicons
                          name={
                            selected
                              ? "checkmark-circle"
                              : "time-outline"
                          }
                          size={17}
                          color={
                            selected
                              ? COLORS.primary
                              : slot.available
                                ? COLORS.textSecondary
                                : COLORS.textMuted
                          }
                        />

                        <Text
                          style={[
                            styles.slotButtonText,
                            selected &&
                              styles.slotButtonTextSelected,
                            !slot.available &&
                              styles.slotButtonTextDisabled,
                          ]}
                        >
                          {slot.label}
                        </Text>
                      </View>

                      {!slot.available ? (
                        <Text
                          style={
                            styles.slotReasonText
                          }
                          numberOfLines={2}
                        >
                          {slot.reason}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <View style={styles.selectedSlotSummary}>
              <View style={styles.selectedSlotIcon}>
                <Ionicons
                  name="bicycle-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.selectedSlotContent}>
                <Text style={styles.selectedSlotTitle}>
                  Selected delivery
                </Text>

                <Text style={styles.selectedSlotText}>
                  {selectedDeliveryDetails.dayLabel}
                  {" · "}
                  {selectedDeliveryDetails.dateLabel}
                </Text>

                <Text style={styles.selectedSlotTime}>
                  {selectedDeliveryDetails.slotLabel}
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={22}
                color={COLORS.primary}
              />
            </View>
          </View>

          {/* Payment method */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                Payment Method
              </Text>

              <Text style={styles.sectionDescription}>
                Select your preferred payment option.
              </Text>
            </View>
          </View>

          <View style={styles.paymentSection}>
            <TouchableOpacity
              style={[
                styles.paymentCard,
                payment === "cod" &&
                  styles.paymentCardActive,
              ]}
              onPress={() => setPayment("cod")}
              activeOpacity={0.85}
              testID="pay-cod"
            >
              <View
                style={[
                  styles.paymentIcon,
                  payment === "cod" &&
                    styles.paymentIconActive,
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={23}
                  color={
                    payment === "cod"
                      ? COLORS.primary
                      : COLORS.textPrimary
                  }
                />
              </View>

              <View style={styles.paymentContent}>
                <Text style={styles.paymentTitle}>
                  Cash on Delivery
                </Text>

                <Text style={styles.paymentSubtitle}>
                  Pay in cash when your order arrives.
                </Text>
              </View>

              <View
                style={[
                  styles.radio,
                  payment === "cod" && styles.radioActive,
                ]}
              >
                {payment === "cod" && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentCard,
                payment === "online" &&
                  styles.paymentCardActive,
              ]}
              onPress={() => setPayment("online")}
              activeOpacity={0.85}
              testID="pay-online"
            >
              <View
                style={[
                  styles.paymentIcon,
                  payment === "online" &&
                    styles.paymentIconActive,
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={23}
                  color={
                    payment === "online"
                      ? COLORS.primary
                      : COLORS.textPrimary
                  }
                />
              </View>

              <View style={styles.paymentContent}>
                <View style={styles.paymentTitleRow}>
                  <Text style={styles.paymentTitle}>
                    Online Payment
                  </Text>

                  <StatusPill
                    label="Coming Soon"
                    tone="warning"
                  />
                </View>

                <Text style={styles.paymentSubtitle}>
                  UPI, debit card, credit card, net banking and wallets.
                </Text>
              </View>

              <View
                style={[
                  styles.radio,
                  payment === "online" &&
                    styles.radioActive,
                ]}
              >
                {payment === "online" && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Coupons and offers */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                Coupons & Offers
              </Text>

              <Text style={styles.sectionDescription}>
                Apply a coupon to save on this order.
              </Text>
            </View>
          </View>

          <View style={styles.couponCard}>
            {appliedCoupon ? (
              <View style={styles.appliedCoupon}>
                <View style={styles.appliedCouponIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.appliedCouponContent}>
                  <Text style={styles.appliedCouponCode}>
                    {appliedCoupon.code}
                  </Text>

                  <Text style={styles.appliedCouponText}>
                    {couponDiscount > 0
                      ? `You saved ${formatCurrency(couponDiscount)}.`
                      : `You saved ${formatCurrency(deliveryDiscount)} on delivery.`}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleRemoveCoupon}
                  activeOpacity={0.75}
                  style={styles.removeCouponButton}
                  testID="remove-coupon"
                >
                  <Text style={styles.removeCouponText}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Input
                  label="Coupon Code"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChangeText={(text) =>
                    setCouponCode(text.toUpperCase())
                  }
                  autoCapitalize="characters"
                  leftIcon="ticket-outline"
                  testID="coupon-code-input"
                />

                <Button
                  label="Apply Coupon"
                  onPress={() => handleApplyCoupon()}
                  fullWidth
                  size="md"
                  variant="outline"
                  disabled={!couponCode.trim()}
                  testID="apply-coupon-button"
                />
              </>
            )}
          </View>

          {availableCoupons.length > 0 && !appliedCoupon ? (
            <View style={styles.availableOffersCard}>
              <View style={styles.availableOffersHeader}>
                <Ionicons
                  name="gift-outline"
                  size={20}
                  color={COLORS.primary}
                />

                <Text style={styles.availableOffersTitle}>
                  Available Offers
                </Text>
              </View>

              {availableCoupons.map((coupon, index) => (
                <View
                  key={coupon.code}
                  style={[
                    styles.availableCouponRow,
                    index > 0 &&
                      styles.availableCouponDivider,
                  ]}
                >
                  <View style={styles.availableCouponContent}>
                    <Text style={styles.availableCouponCode}>
                      {coupon.code}
                    </Text>

                    <Text style={styles.availableCouponDescription}>
                      {coupon.description}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      handleApplyCoupon(coupon.code)
                    }
                    activeOpacity={0.75}
                    style={styles.applyOfferButton}
                  >
                    <Text style={styles.applyOfferText}>
                      APPLY
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {/* Order summary */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="receipt-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                Order Summary
              </Text>

              <Text style={styles.sectionDescription}>
                Review your products and final amount.
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            {cart.map((item) => {
              const product = getProductById(
                item.productId
              );

              if (!product) {
                return null;
              }

              return (
                <View
                  key={item.productId}
                  style={styles.summaryItem}
                >
                  <View style={styles.summaryItemContent}>
                    <Text
                      style={styles.summaryItemName}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>

                    <Text style={styles.summaryItemQuantity}>
                      {product.size} × {item.quantity}
                    </Text>
                  </View>

                  <Text style={styles.summaryItemPrice}>
                    {formatCurrency(
                      product.price * item.quantity
                    )}
                  </Text>
                </View>
              );
            })}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.rowLabel}>
                Item Total
              </Text>

              <Text style={styles.rowValue}>
                {formatCurrency(cartSubtotal)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.rowLabel}>
                Delivery Fee
              </Text>

              {finalDeliveryFee === 0 ? (
                <View style={styles.freeDelivery}>
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={COLORS.primary}
                  />

                  <Text style={styles.freeDeliveryText}>
                    FREE
                  </Text>
                </View>
              ) : (
                <Text style={styles.rowValue}>
                  {formatCurrency(finalDeliveryFee)}
                </Text>
              )}
            </View>

            {deliveryDiscount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>
                  Delivery Discount
                </Text>

                <Text style={styles.discountValue}>
                  -{formatCurrency(deliveryDiscount)}
                </Text>
              </View>
            ) : null}

            {couponDiscount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>
                  Coupon Discount
                </Text>

                <Text style={styles.discountValue}>
                  -{formatCurrency(couponDiscount)}
                </Text>
              </View>
            ) : null}

            <View style={styles.deliverySummaryRow}>
              <View style={styles.deliverySummaryIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.deliverySummaryContent}>
                <Text style={styles.deliverySummaryLabel}>
                  Delivery
                </Text>

                <Text style={styles.deliverySummaryValue}>
                  {selectedDeliveryDetails.dayLabel}
                  {" · "}
                  {selectedDeliveryDetails.slotLabel}
                </Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>
                Total Amount
              </Text>

              <Text style={styles.totalValue}>
                {formatCurrency(finalTotal)}
              </Text>
            </View>

            {couponDiscount + deliveryDiscount > 0 ? (
              <View style={styles.savingsBanner}>
                <Ionicons
                  name="sparkles-outline"
                  size={17}
                  color={COLORS.primary}
                />

                <Text style={styles.savingsText}>
                  You saved {formatCurrency(
                    couponDiscount + deliveryDiscount,
                  )} on this order.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Trust section */}

          <View style={styles.trustCard}>
            <View style={styles.trustItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={COLORS.primary}
              />

              <Text style={styles.trustText}>
                Secure checkout
              </Text>
            </View>

            <View style={styles.trustDivider} />

            <View style={styles.trustItem}>
              <Ionicons
                name="storefront-outline"
                size={21}
                color={COLORS.primary}
              />

              <Text style={styles.trustText}>
                Local store support
              </Text>
            </View>

            <View style={styles.trustDivider} />

            <View style={styles.trustItem}>
              <Ionicons
                name="call-outline"
                size={21}
                color={COLORS.primary}
              />

              <Text style={styles.trustText}>
                Customer assistance
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky footer */}

      <View style={styles.footer}>
        <View style={styles.footerAmountSection}>
          <Text style={styles.footerLabel}>
            Total ({cart.length} item
            {cart.length !== 1 ? "s" : ""})
          </Text>

          <Text style={styles.footerAmount}>
            {formatCurrency(finalTotal)}
          </Text>
        </View>

        <View style={styles.footerButton}>
          <Button
            label={
              placing ? "Placing Order…" : "Place Order"
            }
            onPress={handlePlaceOrder}
            disabled={placing || cart.length === 0}
            loading={placing}
            size="lg"
            testID="place-order-btn"
            rightIcon={
              !placing ? (
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={COLORS.textOnPrimary}
                />
              ) : undefined
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scroll: {
    padding: SPACING.md,
    paddingBottom: 140,
    gap: SPACING.md,
  },

  sectionHeader: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeaderContent: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  sectionDescription: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  addressCard: {
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  checkboxContent: {
    flex: 1,
  },

  checkboxText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  checkboxSubtext: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  deliveryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },

  deliveryIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  deliveryContent: {
    flex: 1,
  },

  deliveryTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  deliverySubtitle: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  deliverySlotCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  deliveryDayRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },

  deliveryDayButton: {
    flex: 1,
    minHeight: 78,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  deliveryDayButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  deliveryDayButtonDisabled: {
    opacity: 0.5,
  },

  deliveryDayLabel: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  deliveryDayLabelSelected: {
    color: COLORS.primary,
  },

  deliveryDateLabel: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  deliveryDateLabelSelected: {
    color: COLORS.primary,
  },

  deliveryDayLabelDisabled: {
    color: COLORS.textMuted,
  },

  deliveryUnavailableText: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.danger,
  },

  slotDivider: {
    height: 1,
    marginVertical: SPACING.md,
    backgroundColor: COLORS.borderLight,
  },

  slotSectionLabel: {
    marginBottom: SPACING.sm,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },

  slotButton: {
    width: "48%",
    minHeight: 62,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
  },

  slotButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  slotButtonDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.background,
  },

  slotButtonTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  slotButtonText: {
    flex: 1,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },

  slotButtonTextSelected: {
    color: COLORS.primary,
  },

  slotButtonTextDisabled: {
    color: COLORS.textMuted,
  },

  slotReasonText: {
    marginTop: 5,
    fontSize: 9,
    color: COLORS.textMuted,
    lineHeight: 13,
  },

  selectedSlotSummary: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  selectedSlotIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedSlotContent: {
    flex: 1,
  },

  selectedSlotTitle: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },

  selectedSlotText: {
    marginTop: 2,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  selectedSlotTime: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  paymentSection: {
    gap: SPACING.md,
  },

  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  paymentCardActive: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },

  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentIconActive: {
    backgroundColor: COLORS.background,
  },

  paymentContent: {
    flex: 1,
  },

  paymentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  paymentTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  paymentSubtitle: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  radioActive: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },

  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  offerIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  offerContent: {
    flex: 1,
  },

  offerTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  offerSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  couponCard: {
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  appliedCoupon: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  appliedCouponIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  appliedCouponContent: {
    flex: 1,
  },

  appliedCouponCode: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  appliedCouponText: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  removeCouponButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },

  removeCouponText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.danger,
  },

  availableOffersCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  availableOffersHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  availableOffersTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  availableCouponRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },

  availableCouponDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  availableCouponContent: {
    flex: 1,
  },

  availableCouponCode: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primary,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    overflow: "hidden",
  },

  availableCouponDescription: {
    marginTop: 5,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  applyOfferButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },

  applyOfferText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  summaryCard: {
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },

  summaryItemContent: {
    flex: 1,
  },

  summaryItemName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },

  summaryItemQuantity: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  summaryItemPrice: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  deliverySummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },

  deliverySummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  deliverySummaryContent: {
    flex: 1,
  },

  deliverySummaryLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  deliverySummaryValue: {
    marginTop: 2,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  summaryDivider: {
    height: 1,
    marginVertical: SPACING.xs,
    backgroundColor: COLORS.borderLight,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowLabel: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
  },

  rowValue: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  freeDelivery: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  freeDeliveryText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  discountLabel: {
    fontSize: FONT.size.md,
    color: COLORS.primary,
  },

  discountValue: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  savingsBanner: {
    marginTop: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
  },

  savingsText: {
    flex: 1,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  totalLabel: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  totalValue: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  trustCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },

  trustItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },

  trustDivider: {
    width: 1,
    height: 34,
    backgroundColor: COLORS.borderLight,
  },

  trustText: {
    fontSize: 10,
    textAlign: "center",
    color: COLORS.textSecondary,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOW.header,
  },

  footerAmountSection: {
    minWidth: 105,
  },

  footerLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  footerAmount: {
    marginTop: 2,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  footerButton: {
    flex: 1,
  },
});