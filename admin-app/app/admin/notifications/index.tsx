import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";

import {
  sendCustomerPushNotification,
  subscribeToNotificationCampaigns,
  type AdminNotificationChannel,
  type NotificationCampaign,
} from "@/src/services/firebaseAdminNotifications";

const CHANNELS: Array<{
  id: AdminNotificationChannel;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "general",
    label: "General",
    icon: "notifications-outline",
  },
  {
    id: "offers",
    label: "Offers",
    icon: "pricetag-outline",
  },
  {
    id: "orders",
    label: "Orders",
    icon: "receipt-outline",
  },
];

function showMessage(
  title: string,
  message: string,
) {
  if (Platform.OS === "web") {
    window.alert(
      `${title}\n\n${message}`,
    );
    return;
  }

  Alert.alert(
    title,
    message,
  );
}

function formatDate(
  value: unknown,
): string {
  const timestamp = value as
    | {
        toDate?: () => Date;
      }
    | undefined;

  if (
    !timestamp ||
    typeof timestamp.toDate !==
      "function"
  ) {
    return "Just now";
  }

  return timestamp
    .toDate()
    .toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
}

export default function AdminNotificationsScreen() {
  const router = useRouter();

  const [title, setTitle] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [route, setRoute] =
    useState(
      "/notifications",
    );

  const [
    channel,
    setChannel,
  ] =
    useState<AdminNotificationChannel>(
      "general",
    );

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(true);

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<
      NotificationCampaign[]
    >([]);

  useEffect(() => {
    const unsubscribe =
      subscribeToNotificationCampaigns(
        (items) => {
          setCampaigns(
            items,
          );
          setHistoryLoading(
            false,
          );
        },
        (error) => {
          console.error(
            "Unable to load notification history:",
            error,
          );
          setHistoryLoading(
            false,
          );
        },
      );

    return unsubscribe;
  }, []);

  const stats =
    useMemo(() => {
      const accepted =
        campaigns.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            item.acceptedCount,
          0,
        );

      const failed =
        campaigns.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            item.failedCount,
          0,
        );

      return {
        campaigns:
          campaigns.length,
        accepted,
        failed,
      };
    }, [campaigns]);

  const sendNotification =
    async () => {
      const cleanTitle =
        title.trim();

      const cleanMessage =
        message.trim();

      if (
        !cleanTitle ||
        !cleanMessage
      ) {
        showMessage(
          "Missing details",
          "Please enter both notification title and message.",
        );
        return;
      }

      const run =
        async () => {
          try {
            setSending(true);

            const result =
              await sendCustomerPushNotification(
                {
                  title:
                    cleanTitle,
                  body:
                    cleanMessage,
                  channel,
                  route:
                    route.trim() ||
                    "/notifications",
                },
              );

            showMessage(
              "Notification sent",
              `Accepted: ${result.acceptedCount}/${result.recipientCount}\nFailed: ${result.failedCount}`,
            );

            setTitle("");
            setMessage("");
          } catch (error) {
            console.error(
              "Notification send failed:",
              error,
            );

            showMessage(
              "Unable to send",
              error instanceof
                Error
                ? error.message
                : "Unable to send notification.",
            );
          } finally {
            setSending(
              false,
            );
          }
        };

      if (
        Platform.OS ===
        "web"
      ) {
        const confirmed =
          window.confirm(
            "Send this notification to all registered customer devices?",
          );

        if (confirmed) {
          await run();
        }

        return;
      }

      Alert.alert(
        "Send Notification",
        "Send this notification to all registered customer devices?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Send",
            onPress: () =>
              void run(),
          },
        ],
      );
    };

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        "top",
        "bottom",
      ]}
    >
      <View
        style={
          styles.header
        }
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={
              COLORS.textPrimary
            }
          />
        </TouchableOpacity>

        <View
          style={
            styles.headerText
          }
        >
          <Text
            style={
              styles.heading
            }
          >
            Notification Management
          </Text>

          <Text
            style={
              styles.subheading
            }
          >
            Send push updates to customer devices
          </Text>
        </View>
      </View>

      <View
        style={
          styles.statsRow
        }
      >
        <StatCard
          label="Campaigns"
          value={
            stats.campaigns
          }
        />

        <StatCard
          label="Accepted"
          value={
            stats.accepted
          }
        />

        <StatCard
          label="Failed"
          value={
            stats.failed
          }
        />
      </View>

      <FlatList
        data={
          campaigns
        }
        keyExtractor={(
          item,
        ) =>
          item.id
        }
        showsVerticalScrollIndicator={
          true
        }
        contentContainerStyle={
          styles.pageContent
        }
        ListHeaderComponent={
          <>
            <View
              style={
                styles.formCard
              }
            >
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View
                  style={
                    styles.sectionIcon
                  }
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={22}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.sectionHeaderText
                  }
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Send Customer Notification
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    This sends to registered customer app devices.
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Notification Type
              </Text>

              <View
                style={
                  styles.channelRow
                }
              >
                {CHANNELS.map(
                  (
                    item,
                  ) => {
                    const selected =
                      channel ===
                      item.id;

                    return (
                      <TouchableOpacity
                        key={
                          item.id
                        }
                        style={[
                          styles.channelChip,
                          selected &&
                            styles.channelChipActive,
                        ]}
                        onPress={() =>
                          setChannel(
                            item.id,
                          )
                        }
                        activeOpacity={
                          0.8
                        }
                      >
                        <Ionicons
                          name={
                            item.icon
                          }
                          size={18}
                          color={
                            selected
                              ? COLORS.textOnPrimary
                              : COLORS.textPrimary
                          }
                        />

                        <Text
                          style={[
                            styles.channelText,
                            selected &&
                              styles.channelTextActive,
                          ]}
                        >
                          {
                            item.label
                          }
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Title
              </Text>

              <TextInput
                value={
                  title
                }
                onChangeText={
                  setTitle
                }
                style={
                  styles.input
                }
                placeholder="Example: Weekend Special Offer"
                placeholderTextColor={
                  COLORS.textMuted
                }
                maxLength={
                  100
                }
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Message
              </Text>

              <TextInput
                value={
                  message
                }
                onChangeText={
                  setMessage
                }
                style={[
                  styles.input,
                  styles.messageInput,
                ]}
                placeholder="Write the message customers should receive..."
                placeholderTextColor={
                  COLORS.textMuted
                }
                multiline
                textAlignVertical="top"
                maxLength={
                  500
                }
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Open App Route
              </Text>

              <TextInput
                value={
                  route
                }
                onChangeText={
                  setRoute
                }
                style={
                  styles.input
                }
                placeholder="/notifications"
                placeholderTextColor={
                  COLORS.textMuted
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                For general notifications keep /notifications.
              </Text>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  sending &&
                    styles.sendButtonDisabled,
                ]}
                onPress={() =>
                  void sendNotification()
                }
                disabled={
                  sending
                }
                activeOpacity={
                  0.85
                }
              >
                <Ionicons
                  name="paper-plane"
                  size={18}
                  color={
                    COLORS.textOnPrimary
                  }
                />

                <Text
                  style={
                    styles.sendButtonText
                  }
                >
                  {sending
                    ? "Sending..."
                    : "Send to Customers"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.historyHeader
              }
            >
              <Text
                style={
                  styles.historyTitle
                }
              >
                Send History
              </Text>

              <Text
                style={
                  styles.historySubtitle
                }
              >
                Latest campaigns
              </Text>
            </View>

            {historyLoading ? (
              <View
                style={
                  styles.emptyHistory
                }
              >
                <Text
                  style={
                    styles.mutedText
                  }
                >
                  Loading notification history...
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !historyLoading ? (
            <View
              style={
                styles.emptyHistory
              }
            >
              <Ionicons
                name="notifications-off-outline"
                size={42}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No notification campaigns yet
              </Text>

              <Text
                style={
                  styles.mutedText
                }
              >
                Sent notifications will appear here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({
          item,
        }) => (
          <View
            style={
              styles.historyCard
            }
          >
            <View
              style={
                styles.historyTopRow
              }
            >
              <View
                style={
                  styles.historyIcon
                }
              >
                <Ionicons
                  name={
                    item.channel ===
                    "offers"
                      ? "pricetag-outline"
                      : item.channel ===
                          "orders"
                        ? "receipt-outline"
                        : "notifications-outline"
                  }
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={
                  styles.historyContent
                }
              >
                <Text
                  style={
                    styles.historyItemTitle
                  }
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.historyDate
                  }
                >
                  {formatDate(
                    item.createdAt,
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.sentBadge
                }
              >
                <Text
                  style={
                    styles.sentBadgeText
                  }
                >
                  Sent
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.historyMessage
              }
            >
              {item.body}
            </Text>

            <View
              style={
                styles.historyStats
              }
            >
              <Text
                style={
                  styles.historyStatText
                }
              >
                Recipients:{" "}
                {
                  item.recipientCount
                }
              </Text>

              <Text
                style={
                  styles.historyStatSuccess
                }
              >
                Accepted:{" "}
                {
                  item.acceptedCount
                }
              </Text>

              <Text
                style={
                  styles.historyStatFailed
                }
              >
                Failed:{" "}
                {
                  item.failedCount
                }
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View
      style={
        styles.statCard
      }
    >
      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    header: {
      minHeight: 76,
      paddingHorizontal:
        SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        SPACING.sm,
      backgroundColor:
        COLORS.background,
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.surface,
    },

    headerText: {
      flex: 1,
    },

    heading: {
      fontSize:
        FONT.xl,
      fontWeight:
        "900",
      color:
        COLORS.textPrimary,
    },

    subheading: {
      marginTop: 2,
      color:
        COLORS.textSecondary,
    },

    statsRow: {
      flexDirection:
        "row",
      gap:
        SPACING.sm,
      padding:
        SPACING.md,
      paddingBottom: 0,
    },

    statCard: {
      flex: 1,
      minHeight: 76,
      borderRadius:
        RADIUS.lg,
      backgroundColor:
        COLORS.surface,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...SHADOW.card,
    },

    statValue: {
      fontSize:
        FONT.lg,
      fontWeight:
        "900",
      color:
        COLORS.primary,
    },

    statLabel: {
      marginTop: 5,
      color:
        COLORS.textSecondary,
    },

    pageContent: {
      padding:
        SPACING.md,
      paddingBottom: 60,
    },

    formCard: {
      borderRadius:
        RADIUS.lg,
      backgroundColor:
        COLORS.surface,
      padding:
        SPACING.md,
      ...SHADOW.card,
    },

    sectionHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        SPACING.sm,
      marginBottom:
        SPACING.md,
    },

    sectionIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    sectionHeaderText: {
      flex: 1,
    },

    sectionTitle: {
      fontWeight:
        "900",
      color:
        COLORS.textPrimary,
      fontSize:
        FONT.md,
    },

    sectionSubtitle: {
      marginTop: 4,
      color:
        COLORS.textSecondary,
    },

    fieldLabel: {
      marginTop:
        SPACING.md,
      marginBottom: 7,
      fontWeight:
        "900",
      color:
        COLORS.textPrimary,
    },

    channelRow: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap:
        SPACING.sm,
    },

    channelChip: {
      minHeight: 42,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 22,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
      paddingHorizontal:
        14,
      backgroundColor:
        COLORS.surface,
    },

    channelChipActive: {
      borderColor:
        COLORS.primary,
      backgroundColor:
        COLORS.primary,
    },

    channelText: {
      fontWeight:
        "800",
      color:
        COLORS.textPrimary,
    },

    channelTextActive: {
      color:
        COLORS.textOnPrimary,
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      paddingHorizontal:
        SPACING.md,
      backgroundColor:
        COLORS.background,
      color:
        COLORS.textPrimary,
    },

    messageInput: {
      minHeight: 100,
      paddingTop:
        SPACING.md,
    },

    helperText: {
      marginTop: 8,
      fontSize: 12,
      color:
        COLORS.textMuted,
    },

    sendButton: {
      marginTop:
        SPACING.md,
      minHeight: 52,
      borderRadius:
        RADIUS.md,
      backgroundColor:
        COLORS.primary,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap:
        SPACING.sm,
    },

    sendButtonDisabled: {
      opacity: 0.55,
    },

    sendButtonText: {
      color:
        COLORS.textOnPrimary,
      fontWeight:
        "900",
      fontSize:
        FONT.md,
    },

    historyHeader: {
      marginTop:
        SPACING.lg,
      marginBottom:
        SPACING.sm,
    },

    historyTitle: {
      fontWeight:
        "900",
      color:
        COLORS.textPrimary,
      fontSize:
        FONT.md,
    },

    historySubtitle: {
      marginTop: 4,
      color:
        COLORS.textSecondary,
    },

    historyCard: {
      marginBottom:
        SPACING.sm,
      borderRadius:
        RADIUS.lg,
      backgroundColor:
        COLORS.surface,
      padding:
        SPACING.md,
      ...SHADOW.card,
    },

    historyTopRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        SPACING.sm,
    },

    historyIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    historyContent: {
      flex: 1,
    },

    historyItemTitle: {
      fontWeight:
        "900",
      color:
        COLORS.textPrimary,
    },

    historyDate: {
      marginTop: 4,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    sentBadge: {
      minHeight: 26,
      borderRadius: 13,
      paddingHorizontal:
        10,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    sentBadgeText: {
      color:
        COLORS.primary,
      fontWeight:
        "800",
      fontSize: 11,
    },

    historyMessage: {
      marginTop:
        SPACING.sm,
      lineHeight: 20,
      color:
        COLORS.textPrimary,
    },

    historyStats: {
      marginTop:
        SPACING.sm,
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap:
        SPACING.md,
    },

    historyStatText: {
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    historyStatSuccess: {
      fontSize: 12,
      color:
        COLORS.primary,
      fontWeight:
        "700",
    },

    historyStatFailed: {
      fontSize: 12,
      color:
        "#DC2626",
      fontWeight:
        "700",
    },

    emptyHistory: {
      minHeight: 160,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding:
        SPACING.lg,
    },

    emptyTitle: {
      marginTop:
        SPACING.sm,
      fontWeight:
        "900",
      color:
        COLORS.textPrimary,
      textAlign:
        "center",
    },

    mutedText: {
      marginTop: 5,
      color:
        COLORS.textMuted,
      textAlign:
        "center",
    },
  });