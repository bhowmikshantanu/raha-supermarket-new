import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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
  createFirebaseCoupon,
  deleteFirebaseCoupon,
  initializeDefaultCoupons,
  isFirebaseCouponExpired,
  setFirebaseCouponActive,
  subscribeToFirebaseCoupons,
  updateFirebaseCoupon,
  type CouponType,
  type FirebaseCoupon,
} from "@/src/services/firebaseCoupons";

type FormState = {
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: string;
  minOrder: string;
  maxDiscount: string;
  expiry: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  title: "",
  description: "",
  type: "flat",
  value: "",
  minOrder: "",
  maxDiscount: "",
  expiry: "2028-12-31",
  sortOrder: "0",
  active: true,
};

const TYPES: {
  id: CouponType;
  label: string;
}[] = [
  {
    id: "flat",
    label: "Flat ₹ Off",
  },
  {
    id: "percent",
    label: "Percentage %",
  },
  {
    id: "free-delivery",
    label: "Free Delivery",
  },
];

function showMessage(
  message: string,
) {
  if (
    Platform.OS === "web"
  ) {
    window.alert(
      message,
    );
    return;
  }

  Alert.alert(
    "Coupons",
    message,
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string,
  ) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  editable?: boolean;
  multiline?: boolean;
}) {
  return (
    <View
      style={
        styles.fieldWrap
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          COLORS.textMuted
        }
        style={[
          styles.input,
          multiline &&
            styles.multilineInput,
          !editable &&
            styles.disabledInput,
        ]}
        keyboardType={
          keyboardType
        }
        editable={
          editable
        }
        multiline={
          multiline
        }
        textAlignVertical={
          multiline
            ? "top"
            : "center"
        }
      />
    </View>
  );
}

export default function AdminCouponsScreen() {
  const router =
    useRouter();

  const [
    coupons,
    setCoupons,
  ] = useState<
    FirebaseCoupon[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    editingCoupon,
    setEditingCoupon,
  ] = useState<
    FirebaseCoupon | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    EMPTY_FORM,
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    busyId,
    setBusyId,
  ] = useState<
    string | null
  >(null);

  const [
    initializing,
    setInitializing,
  ] = useState(false);

  useEffect(() => {
    const unsubscribe =
      subscribeToFirebaseCoupons(
        (items) => {
          setCoupons(
            items,
          );
          setLoading(
            false,
          );
        },
        (error) => {
          console.error(
            "Coupons subscription failed:",
            error,
          );
          setLoading(
            false,
          );
          showMessage(
            "Unable to load coupons from Firebase.",
          );
        },
      );

    return unsubscribe;
  }, []);

  const stats =
    useMemo(() => {
      const active =
        coupons.filter(
          (coupon) =>
            coupon.active &&
            !isFirebaseCouponExpired(
              coupon,
            ),
        ).length;

      const expired =
        coupons.filter(
          (coupon) =>
            isFirebaseCouponExpired(
              coupon,
            ),
        ).length;

      return {
        total:
          coupons.length,
        active,
        expired,
      };
    }, [
      coupons,
    ]);

  const filteredCoupons =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return coupons;
      }

      return coupons.filter(
        (coupon) =>
          coupon.code
            .toLowerCase()
            .includes(q) ||
          coupon.title
            .toLowerCase()
            .includes(q) ||
          coupon.description
            .toLowerCase()
            .includes(q),
      );
    }, [
      coupons,
      search,
    ]);

  const updateField = <
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K],
  ) => {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };

  const openCreateModal =
    () => {
      setEditingCoupon(
        null,
      );

      setForm({
        ...EMPTY_FORM,
        sortOrder:
          String(
            coupons.length +
              1,
          ),
      });

      setModalVisible(
        true,
      );
    };

  const openEditModal = (
    coupon: FirebaseCoupon,
  ) => {
    setEditingCoupon(
      coupon,
    );

    setForm({
      code:
        coupon.code,
      title:
        coupon.title,
      description:
        coupon.description,
      type:
        coupon.type,
      value:
        String(
          coupon.value,
        ),
      minOrder:
        String(
          coupon.minOrder,
        ),
      maxDiscount:
        coupon.maxDiscount ===
        undefined
          ? ""
          : String(
              coupon.maxDiscount,
            ),
      expiry:
        coupon.expiry,
      sortOrder:
        String(
          coupon.sortOrder,
        ),
      active:
        coupon.active,
    });

    setModalVisible(
      true,
    );
  };

  const closeModal =
    () => {
      if (saving) {
        return;
      }

      setModalVisible(
        false,
      );

      setEditingCoupon(
        null,
      );

      setForm(
        EMPTY_FORM,
      );
    };

  const handleSave =
    async () => {
      if (saving) {
        return;
      }

      try {
        setSaving(
          true,
        );

        const payload = {
          code:
            form.code,
          title:
            form.title,
          description:
            form.description,
          type:
            form.type,
          value:
            Number(
              form.value ||
                0,
            ),
          minOrder:
            Number(
              form.minOrder ||
                0,
            ),
          maxDiscount:
            form.maxDiscount.trim()
              ? Number(
                  form.maxDiscount,
                )
              : undefined,
          expiry:
            form.expiry,
          sortOrder:
            Number(
              form.sortOrder ||
                0,
            ),
          active:
            form.active,
        };

        if (
          editingCoupon
        ) {
          await updateFirebaseCoupon(
            editingCoupon.id,
            payload,
          );
        } else {
          await createFirebaseCoupon(
            payload,
          );
        }

        closeModal();
      } catch (error) {
        console.error(
          "Coupon save failed:",
          error,
        );

        showMessage(
          error instanceof Error
            ? error.message
            : "Unable to save coupon.",
        );
      } finally {
        setSaving(
          false,
        );
      }
    };

  const handleToggle =
    async (
      coupon: FirebaseCoupon,
    ) => {
      if (busyId) {
        return;
      }

      try {
        setBusyId(
          coupon.id,
        );

        await setFirebaseCouponActive(
          coupon.id,
          !coupon.active,
        );
      } catch (error) {
        console.error(
          "Coupon status update failed:",
          error,
        );

        showMessage(
          "Unable to update coupon status.",
        );
      } finally {
        setBusyId(
          null,
        );
      }
    };

  const handleDelete = (
    coupon: FirebaseCoupon,
  ) => {
    const proceed =
      async () => {
        try {
          setBusyId(
            coupon.id,
          );

          await deleteFirebaseCoupon(
            coupon.id,
          );
        } catch (error) {
          console.error(
            "Coupon delete failed:",
            error,
          );

          showMessage(
            error instanceof Error
              ? error.message
              : "Unable to delete coupon.",
          );
        } finally {
          setBusyId(
            null,
          );
        }
      };

    if (
      Platform.OS ===
      "web"
    ) {
      if (
        window.confirm(
          `Delete coupon "${coupon.code}"?`,
        )
      ) {
        void proceed();
      }

      return;
    }

    Alert.alert(
      "Delete Coupon",
      `Delete coupon "${coupon.code}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style:
            "destructive",
          onPress: () =>
            void proceed(),
        },
      ],
    );
  };

  const handleInitialize =
    async () => {
      if (
        initializing
      ) {
        return;
      }

      const run =
        async () => {
          try {
            setInitializing(
              true,
            );

            await initializeDefaultCoupons();

            showMessage(
              "Default Raha Supermarket coupons added.",
            );
          } catch (error) {
            console.error(
              "Coupon initialization failed:",
              error,
            );

            showMessage(
              error instanceof Error
                ? error.message
                : "Unable to initialize coupons.",
            );
          } finally {
            setInitializing(
              false,
            );
          }
        };

      if (
        Platform.OS ===
        "web"
      ) {
        if (
          window.confirm(
            "Initialize the default Raha Supermarket coupons?",
          )
        ) {
          await run();
        }

        return;
      }

      Alert.alert(
        "Initialize Coupons",
        "Add the default Raha Supermarket coupons?",
        [
          {
            text: "Cancel",
            style:
              "cancel",
          },
          {
            text:
              "Initialize",
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
            styles.headerButton
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
              styles.title
            }
          >
            Coupon Management
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Create offers and discounts
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.addButton
          }
          onPress={
            openCreateModal
          }
        >
          <Ionicons
            name="add"
            size={24}
            color={
              COLORS.textOnPrimary
            }
          />
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.statsRow
        }
      >
        <StatCard
          label="Total"
          value={
            stats.total
          }
        />

        <StatCard
          label="Active"
          value={
            stats.active
          }
        />

        <StatCard
          label="Expired"
          value={
            stats.expired
          }
        />
      </View>

      <View
        style={
          styles.searchWrap
        }
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={
            COLORS.textSecondary
          }
        />

        <TextInput
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Search coupon code or title"
          placeholderTextColor={
            COLORS.textMuted
          }
          style={
            styles.searchInput
          }
          autoCapitalize="characters"
        />
      </View>

      {loading ? (
        <View
          style={
            styles.center
          }
        >
          <Text
            style={
              styles.muted
            }
          >
            Loading coupons…
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            filteredCoupons
          }
          keyExtractor={(
            item,
          ) =>
            item.id
          }
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            true
          }
          ListEmptyComponent={
            <View
              style={
                styles.empty
              }
            >
              <Ionicons
                name="pricetag-outline"
                size={50}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No coupons found
              </Text>

              <Text
                style={
                  styles.muted
                }
              >
                Initialize the default offers or create a new coupon.
              </Text>

              <TouchableOpacity
                style={[
                  styles.initializeButton,
                  initializing &&
                    styles.disabled,
                ]}
                onPress={() =>
                  void handleInitialize()
                }
                disabled={
                  initializing
                }
              >
                <Ionicons
                  name="flash-outline"
                  size={18}
                  color={
                    COLORS.textOnPrimary
                  }
                />

                <Text
                  style={
                    styles.initializeText
                  }
                >
                  {initializing
                    ? "Initializing..."
                    : "Initialize Default Coupons"}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({
            item,
          }) => {
            const expired =
              isFirebaseCouponExpired(
                item,
              );

            return (
              <View
                style={
                  styles.couponCard
                }
              >
                <View
                  style={
                    styles.couponIcon
                  }
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={22}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.couponContent
                  }
                >
                  <View
                    style={
                      styles.codeRow
                    }
                  >
                    <Text
                      style={
                        styles.couponCode
                      }
                    >
                      {item.code}
                    </Text>

                    <View
                      style={[
                        styles.statusPill,
                        expired
                          ? styles.expiredPill
                          : item.active
                            ? styles.activePill
                            : styles.inactivePill,
                      ]}
                    >
                      <Text
                        style={
                          styles.statusText
                        }
                      >
                        {expired
                          ? "Expired"
                          : item.active
                            ? "Active"
                            : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.couponTitle
                    }
                  >
                    {item.title}
                  </Text>

                  <Text
                    style={
                      styles.couponDescription
                    }
                  >
                    {item.description}
                  </Text>

                  <Text
                    style={
                      styles.couponMeta
                    }
                  >
                    Min order ₹{item.minOrder} · Expires {item.expiry}
                  </Text>
                </View>

                <View
                  style={
                    styles.actions
                  }
                >
                  <Switch
                    value={
                      item.active
                    }
                    onValueChange={() =>
                      void handleToggle(
                        item,
                      )
                    }
                    disabled={
                      busyId ===
                      item.id
                    }
                    trackColor={{
                      false:
                        COLORS.border,
                      true:
                        COLORS.primarySoft,
                    }}
                    thumbColor={
                      item.active
                        ? COLORS.primary
                        : COLORS.textMuted
                    }
                  />

                  <TouchableOpacity
                    style={
                      styles.actionButton
                    }
                    onPress={() =>
                      openEditModal(
                        item,
                      )
                    }
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={
                        COLORS.primary
                      }
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.actionButton
                    }
                    onPress={() =>
                      handleDelete(
                        item,
                      )
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeModal
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <ScrollView
              showsVerticalScrollIndicator={
                true
              }
              contentContainerStyle={
                styles.modalContent
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {editingCoupon
                      ? "Edit Coupon"
                      : "Add Coupon"}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingCoupon
                      ? editingCoupon.code
                      : "Create a customer offer"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={
                    closeModal
                  }
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color={
                      COLORS.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>

              <Field
                label="Coupon Code"
                value={
                  form.code
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "code",
                    value.toUpperCase(),
                  )
                }
                placeholder="WELCOME50"
                editable={
                  !editingCoupon
                }
              />

              <Field
                label="Title"
                value={
                  form.title
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "title",
                    value,
                  )
                }
                placeholder="Welcome Offer"
              />

              <Field
                label="Description"
                value={
                  form.description
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "description",
                    value,
                  )
                }
                placeholder="Get ₹50 off on orders above ₹299."
                multiline
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Coupon Type
              </Text>

              <View
                style={
                  styles.typeRow
                }
              >
                {TYPES.map(
                  (item) => {
                    const selected =
                      form.type ===
                      item.id;

                    return (
                      <TouchableOpacity
                        key={
                          item.id
                        }
                        style={[
                          styles.typeChip,
                          selected &&
                            styles.typeChipActive,
                        ]}
                        onPress={() =>
                          updateField(
                            "type",
                            item.id,
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            selected &&
                              styles.typeChipTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>

              {form.type !==
              "free-delivery" ? (
                <Field
                  label={
                    form.type ===
                    "percent"
                      ? "Discount Percentage"
                      : "Discount Amount (₹)"
                  }
                  value={
                    form.value
                  }
                  onChangeText={(
                    value,
                  ) =>
                    updateField(
                      "value",
                      value,
                    )
                  }
                  keyboardType="numeric"
                  placeholder={
                    form.type ===
                    "percent"
                      ? "10"
                      : "50"
                  }
                />
              ) : null}

              <Field
                label="Minimum Order (₹)"
                value={
                  form.minOrder
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "minOrder",
                    value,
                  )
                }
                keyboardType="numeric"
                placeholder="299"
              />

              {form.type ===
              "percent" ? (
                <Field
                  label="Maximum Discount (₹)"
                  value={
                    form.maxDiscount
                  }
                  onChangeText={(
                    value,
                  ) =>
                    updateField(
                      "maxDiscount",
                      value,
                    )
                  }
                  keyboardType="numeric"
                  placeholder="150"
                />
              ) : null}

              <Field
                label="Expiry Date"
                value={
                  form.expiry
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "expiry",
                    value,
                  )
                }
                placeholder="YYYY-MM-DD"
              />

              <Field
                label="Sort Order"
                value={
                  form.sortOrder
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "sortOrder",
                    value,
                  )
                }
                keyboardType="numeric"
                placeholder="1"
              />

              <View
                style={
                  styles.activeRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.activeTitle
                    }
                  >
                    Active Coupon
                  </Text>

                  <Text
                    style={
                      styles.muted
                    }
                  >
                    Customers can use this coupon while it is active and not expired.
                  </Text>
                </View>

                <Switch
                  value={
                    form.active
                  }
                  onValueChange={(
                    value,
                  ) =>
                    updateField(
                      "active",
                      value,
                    )
                  }
                />
              </View>

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    saving &&
                      styles.disabled,
                  ]}
                  disabled={
                    saving
                  }
                  onPress={
                    closeModal
                  }
                >
                  <Text
                    style={
                      styles.secondaryText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    saving &&
                      styles.disabled,
                  ]}
                  disabled={
                    saving
                  }
                  onPress={() =>
                    void handleSave()
                  }
                >
                  <Text
                    style={
                      styles.primaryText
                    }
                  >
                    {saving
                      ? "Saving..."
                      : editingCoupon
                        ? "Update Coupon"
                        : "Create Coupon"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
      gap: SPACING.sm,
    },
    headerButton: {
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
    title: {
      fontSize:
        FONT.xl,
      fontWeight:
        "800",
      color:
        COLORS.textPrimary,
    },
    subtitle: {
      marginTop: 2,
      color:
        COLORS.textSecondary,
    },
    addButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.primary,
    },
    statsRow: {
      flexDirection:
        "row",
      padding:
        SPACING.md,
      gap:
        SPACING.sm,
    },
    statCard: {
      flex: 1,
      minHeight: 74,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        RADIUS.lg,
      backgroundColor:
        COLORS.surface,
      ...SHADOW.card,
    },
    statValue: {
      fontSize:
        FONT.xl,
      fontWeight:
        "800",
      color:
        COLORS.primary,
    },
    statLabel: {
      marginTop: 4,
      color:
        COLORS.textSecondary,
    },
    searchWrap: {
      marginHorizontal:
        SPACING.md,
      minHeight: 48,
      borderRadius:
        RADIUS.md,
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        SPACING.md,
      gap:
        SPACING.sm,
    },
    searchInput: {
      flex: 1,
      color:
        COLORS.textPrimary,
    },
    list: {
      padding:
        SPACING.md,
      gap:
        SPACING.sm,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },
    muted: {
      color:
        COLORS.textSecondary,
    },
    empty: {
      minHeight: 330,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding:
        SPACING.xl,
    },
    emptyTitle: {
      marginTop:
        SPACING.md,
      fontSize:
        FONT.lg,
      fontWeight:
        "800",
      color:
        COLORS.textPrimary,
    },
    initializeButton: {
      marginTop:
        SPACING.lg,
      minHeight: 48,
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
      paddingHorizontal:
        SPACING.lg,
      gap:
        SPACING.sm,
    },
    initializeText: {
      color:
        COLORS.textOnPrimary,
      fontWeight:
        "800",
    },
    disabled: {
      opacity: 0.55,
    },
    couponCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      borderRadius:
        RADIUS.lg,
      backgroundColor:
        COLORS.surface,
      padding:
        SPACING.md,
      gap:
        SPACING.md,
      ...SHADOW.card,
    },
    couponIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.primarySoft,
    },
    couponContent: {
      flex: 1,
    },
    codeRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        SPACING.sm,
    },
    couponCode: {
      fontSize:
        FONT.md,
      fontWeight:
        "900",
      color:
        COLORS.primary,
    },
    statusPill: {
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    activePill: {
      backgroundColor:
        "#dcfce7",
    },
    inactivePill: {
      backgroundColor:
        "#e5e7eb",
    },
    expiredPill: {
      backgroundColor:
        "#fee2e2",
    },
    statusText: {
      fontSize: 11,
      fontWeight:
        "700",
      color:
        COLORS.textPrimary,
    },
    couponTitle: {
      marginTop: 4,
      fontWeight:
        "800",
      color:
        COLORS.textPrimary,
    },
    couponDescription: {
      marginTop: 3,
      color:
        COLORS.textSecondary,
    },
    couponMeta: {
      marginTop: 6,
      fontSize: 12,
      color:
        COLORS.textMuted,
    },
    actions: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        SPACING.xs,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.background,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor:
        "rgba(15, 23, 42, 0.48)",
      alignItems:
        "center",
      justifyContent:
        "center",
      padding:
        SPACING.md,
    },
    modalCard: {
      width: "100%",
      maxWidth: 620,
      maxHeight: "92%",
      borderRadius:
        RADIUS.xl,
      backgroundColor:
        COLORS.surface,
      ...SHADOW.card,
    },
    modalContent: {
      padding:
        SPACING.lg,
      gap:
        SPACING.md,
    },
    modalHeader: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between",
    },
    modalTitle: {
      fontSize:
        FONT.xl,
      fontWeight:
        "900",
      color:
        COLORS.textPrimary,
    },
    modalSubtitle: {
      marginTop: 3,
      color:
        COLORS.textSecondary,
    },
    fieldWrap: {
      gap: 7,
    },
    fieldLabel: {
      fontWeight:
        "700",
      color:
        COLORS.textPrimary,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      paddingHorizontal:
        SPACING.md,
      color:
        COLORS.textPrimary,
      backgroundColor:
        COLORS.background,
    },
    multilineInput: {
      minHeight: 90,
      paddingTop:
        SPACING.md,
    },
    disabledInput: {
      opacity: 0.62,
    },
    typeRow: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap:
        SPACING.sm,
    },
    typeChip: {
      minHeight: 40,
      paddingHorizontal:
        SPACING.md,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.background,
    },
    typeChipActive: {
      backgroundColor:
        COLORS.primary,
      borderColor:
        COLORS.primary,
    },
    typeChipText: {
      color:
        COLORS.textPrimary,
      fontWeight:
        "700",
    },
    typeChipTextActive: {
      color:
        COLORS.textOnPrimary,
    },
    activeRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap:
        SPACING.lg,
      padding:
        SPACING.md,
      borderRadius:
        RADIUS.md,
      backgroundColor:
        COLORS.background,
    },
    activeTitle: {
      fontWeight:
        "800",
      color:
        COLORS.textPrimary,
    },
    modalActions: {
      flexDirection:
        "row",
      gap:
        SPACING.sm,
      paddingTop:
        SPACING.sm,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      alignItems:
        "center",
      justifyContent:
        "center",
    },
    secondaryText: {
      fontWeight:
        "800",
      color:
        COLORS.textPrimary,
    },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius:
        RADIUS.md,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.primary,
    },
    primaryText: {
      color:
        COLORS.textOnPrimary,
      fontWeight:
        "900",
    },
  });