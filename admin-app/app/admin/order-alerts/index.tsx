import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  OrderAlertRecipient,
  addOrderAlertRecipient,
  getOrderAlertRecipients,
  registerThisDeviceForOrderAlerts,
  removeOrderAlertRecipient,
} from "@/src/services/firebaseAdminOrderAlerts";

const NAVY = "#082F5B";
const NAVY_DARK = "#052445";
const GOLD = "#F3B53F";

export default function AdminOrderAlertsScreen() {
  const router = useRouter();

  const [recipients, setRecipients] = useState<OrderAlertRecipient[]>([]);
  const [phone, setPhone] = useState("");
  const [devicePhone, setDevicePhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);

  const loadRecipients = useCallback(async () => {
    try {
      const data = await getOrderAlertRecipients();
      setRecipients(data);
    } catch (error: any) {
      Alert.alert(
        "Unable to load",
        error?.message || "Could not load order alert recipients.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const addRecipient = async () => {
    if (!phone.trim()) {
      Alert.alert("Mobile number required", "Enter a mobile number first.");
      return;
    }

    try {
      setSaving(true);
      await addOrderAlertRecipient(phone.trim());
      setPhone("");
      await loadRecipients();

      Alert.alert(
        "Recipient added",
        "Now register the Raha app on the phone that should receive order alerts.",
      );
    } catch (error: any) {
      Alert.alert(
        "Could not add number",
        error?.message || "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const performRemoveRecipient = async (
    recipient: OrderAlertRecipient,
  ) => {
    try {
      await removeOrderAlertRecipient(recipient.id);
      await loadRecipients();

      if (Platform.OS === "web") {
        window.alert(`${recipient.phone} was removed from order alerts.`);
      }
    } catch (error: any) {
      const message = error?.message || "Please try again.";

      if (Platform.OS === "web") {
        window.alert(`Could not remove number: ${message}`);
      } else {
        Alert.alert("Could not remove number", message);
      }
    }
  };

  const removeRecipient = (recipient: OrderAlertRecipient) => {
    const message =
      `${recipient.phone} will stop receiving new-order alerts.`;

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Remove order alerts?\n\n${message}`,
      );

      if (confirmed) {
        void performRemoveRecipient(recipient);
      }

      return;
    }

    Alert.alert(
      "Remove order alerts?",
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void performRemoveRecipient(recipient);
          },
        },
      ],
    );
  };

  const registerDevice = async () => {
    if (!devicePhone.trim()) {
      Alert.alert(
        "Mobile number required",
        "Enter one of the configured recipient numbers.",
      );
      return;
    }

    if (Platform.OS === "web") {
      Alert.alert(
        "Use Android app",
        "Device registration must be done from the Raha Supermarket Android app.",
      );
      return;
    }

    try {
      setRegistering(true);

      await registerThisDeviceForOrderAlerts(
        devicePhone.trim(),
      );

      await loadRecipients();

      Alert.alert(
        "Phone registered",
        "This device can now receive new customer-order alerts even after admin logout.",
      );
    } catch (error: any) {
      Alert.alert(
        "Registration failed",
        error?.message || "Please try again.",
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Order Alerts</Text>
          <Text style={styles.headerSubtitle}>
            Customer order notification recipients
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadRecipients();
            }}
          />
        }
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            How Order Alerts Work
          </Text>

          <Text style={styles.infoText}>
            Add the mobile numbers that should receive new customer-order
            notifications. Each number must be registered once from the Raha
            Supermarket Android app on that phone.
          </Text>

          <Text style={styles.infoStrong}>
            After registration, notifications can continue even when the admin
            is logged out.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Notification Recipients
          </Text>

          <Text style={styles.label}>
            Admin mobile number
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 9045747008"
            keyboardType="phone-pad"
            style={styles.input}
            maxLength={16}
          />

          <Pressable
            style={[
              styles.primaryButton,
              saving && styles.disabledButton,
            ]}
            disabled={saving}
            onPress={addRecipient}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Add Recipient
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Active Recipients
            </Text>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {recipients.length}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={NAVY}
              style={styles.loader}
            />
          ) : recipients.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                No recipients added
              </Text>
              <Text style={styles.emptyText}>
                Add at least one mobile number above.
              </Text>
            </View>
          ) : (
            recipients.map((recipient) => (
              <View
                key={recipient.id}
                style={styles.recipientRow}
              >
                <View style={styles.recipientInfo}>
                  <Text style={styles.phoneText}>
                    {recipient.phone}
                  </Text>

                  <Text style={styles.deviceText}>
                    {recipient.registeredDevices > 0
                      ? `${recipient.registeredDevices} registered device${
                          recipient.registeredDevices === 1 ? "" : "s"
                        }`
                      : "No registered device yet"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    recipient.registeredDevices > 0
                      ? styles.readyBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {recipient.registeredDevices > 0
                      ? "Ready"
                      : "Setup"}
                  </Text>
                </View>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeRecipient(recipient)}
                >
                  <Text style={styles.removeText}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.registerCard}>
          <Text style={styles.registerTitle}>
            Register This Phone
          </Text>

          <Text style={styles.registerDescription}>
            Open this page on the Android phone that should receive order
            alerts. Enter a recipient number already added above, then tap
            Register This Device.
          </Text>

          <TextInput
            value={devicePhone}
            onChangeText={setDevicePhone}
            placeholder="Recipient mobile number"
            keyboardType="phone-pad"
            style={styles.input}
            maxLength={16}
          />

          <Pressable
            style={[
              styles.goldButton,
              registering && styles.disabledButton,
            ]}
            disabled={registering}
            onPress={registerDevice}
          >
            {registering ? (
              <ActivityIndicator color={NAVY_DARK} />
            ) : (
              <Text style={styles.goldButtonText}>
                Register This Device
              </Text>
            )}
          </Pressable>

          <Text style={styles.securityNote}>
            Order access still requires an active authorized admin login.
            Tapping an alert while logged out will first open Admin Login.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },

  /* ---------- HEADER ---------- */
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backText: {
    color: "#102A43",
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "500",
  },

  headerTextWrap: {
    flex: 1,
  },

  headerTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 60,
    width: "100%",
    maxWidth: 940,
    alignSelf: "center",
  },

  /* ---------- INFORMATION HERO ---------- */
  infoCard: {
    backgroundColor: "#102A43",
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1D4262",
    shadowColor: "#102A43",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  infoTitle: {
    color: "#F4C95D",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 9,
    letterSpacing: -0.2,
  },

  infoText: {
    color: "#D8E5F3",
    fontSize: 13,
    lineHeight: 20,
  },

  infoStrong: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 12,
  },

  /* ---------- STANDARD CARD ---------- */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E1E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.055,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },

  sectionTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  /* ---------- ADD RECIPIENT ---------- */
  label: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#DDE5EF",
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },

  primaryButton: {
    backgroundColor: "#102A43",
    borderRadius: 13,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#102A43",
    shadowOpacity: 0.17,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.5,
  },

  /* ---------- RECIPIENT COUNT ---------- */
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F4D98B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },

  countText: {
    color: "#8A6116",
    fontSize: 12,
    fontWeight: "900",
  },

  loader: {
    marginVertical: 26,
  },

  /* ---------- EMPTY ---------- */
  emptyBox: {
    paddingVertical: 30,
    paddingHorizontal: 18,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E8EDF3",
  },

  emptyTitle: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 15,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 17,
  },

  /* ---------- RECIPIENT ROW ---------- */
  recipientRow: {
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  recipientInfo: {
    flex: 1,
  },

  phoneText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.1,
  },

  deviceText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 5,
  },

  /* ---------- STATUS ---------- */
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },

  readyBadge: {
    backgroundColor: "#E7F8F1",
    borderColor: "#CDE7E2",
  },

  pendingBadge: {
    backgroundColor: "#FFF7DF",
    borderColor: "#F4D98B",
  },

  statusText: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  /* ---------- REMOVE ---------- */
  removeButton: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },

  removeText: {
    color: "#BE123C",
    fontSize: 10,
    fontWeight: "900",
  },

  /* ---------- DEVICE REGISTRATION ---------- */
  registerCard: {
    backgroundColor: "#0B2239",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#183B59",
    shadowColor: "#0B2239",
    shadowOpacity: 0.17,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  registerTitle: {
    color: "#F4C95D",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 9,
    letterSpacing: -0.2,
  },

  registerDescription: {
    color: "#D8E5F3",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 17,
  },

  goldButton: {
    backgroundColor: "#D69E2E",
    borderRadius: 13,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D69E2E",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  goldButtonText: {
    color: "#102A43",
    fontSize: 14,
    fontWeight: "900",
  },

  securityNote: {
    color: "#AFC2D5",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
});
