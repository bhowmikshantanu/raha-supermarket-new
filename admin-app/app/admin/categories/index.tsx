import { Ionicons } from "@expo/vector-icons";
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
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";

import {
  createFirebaseCategory,
  deleteFirebaseCategory,
  initializeDefaultCategories,
  setFirebaseCategoryActive,
  subscribeToFirebaseCategories,
  updateFirebaseCategory,
  type FirebaseCategory,
} from "@/src/services/firebaseCategories";

type FormState = {
  name: string;
  slug: string;
  icon: string;
  image: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  icon: "grid-outline",
  image: "",
  sortOrder: "0",
  active: true,
};

export default function AdminCategoriesScreen() {
  const router = useRouter();

  const { action } = useLocalSearchParams<{
    action?: string;
  }>();

  const [categories, setCategories] = useState<
    FirebaseCategory[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [errorText, setErrorText] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState<FirebaseCategory | null>(
      null,
    );

  const [form, setForm] =
    useState<FormState>(
      EMPTY_FORM,
    );

  const [saving, setSaving] =
    useState(false);

  const [busyId, setBusyId] =
    useState<string | null>(
      null,
    );

  const [initializing, setInitializing] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      subscribeToFirebaseCategories(
        (items) => {
          setCategories(items);
          setLoading(false);
          setErrorText("");
        },
        (error) => {
          console.error(
            "Categories subscription failed:",
            error,
          );

          setLoading(false);
          setErrorText(
            "Unable to load categories from Firebase.",
          );
        },
      );

    return unsubscribe;
  }, []);

  const filteredCategories =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return categories;
      }

      return categories.filter(
        (category) =>
          category.name
            .toLowerCase()
            .includes(q) ||
          category.id
            .toLowerCase()
            .includes(q) ||
          category.slug
            .toLowerCase()
            .includes(q),
      );
    }, [
      categories,
      search,
    ]);

  const stats = useMemo(() => {
    const active =
      categories.filter(
        (item) =>
          item.active,
      ).length;

    return {
      total:
        categories.length,
      active,
      inactive:
        categories.length -
        active,
    };
  }, [categories]);

  const openCreateModal = () => {
    setEditingCategory(null);

    setForm({
      ...EMPTY_FORM,
      sortOrder: String(
        categories.length,
      ),
    });

    setModalVisible(true);
  };

  useEffect(() => {
    if (
      action !== "add" ||
      loading
    ) {
      return;
    }

    openCreateModal();
  }, [action, loading]);

  const openEditModal = (
    category: FirebaseCategory,
  ) => {
    setEditingCategory(
      category,
    );

    setForm({
      name:
        category.name,
      slug:
        category.slug,
      icon:
        category.icon ??
        "grid-outline",
      image:
        category.image ??
        "",
      sortOrder:
        String(
          category.sortOrder,
        ),
      active:
        category.active,
    });

    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingCategory(null);
    setForm(EMPTY_FORM);
  };

  const updateField = <
    K extends keyof FormState
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

  const handleSave =
    async () => {
      if (saving) {
        return;
      }

      const name =
        form.name.trim();

      if (!name) {
        showMessage(
          "Category name is required.",
        );
        return;
      }

      const sortOrder =
        Number(
          form.sortOrder,
        );

      if (
        !Number.isFinite(
          sortOrder,
        ) ||
        sortOrder < 0
      ) {
        showMessage(
          "Sort order must be 0 or greater.",
        );
        return;
      }

      try {
        setSaving(true);

        if (
          editingCategory
        ) {
          await updateFirebaseCategory(
            editingCategory.id,
            {
              name,
              slug:
                form.slug,
              icon:
                form.icon,
              image:
                form.image,
              sortOrder:
                Math.floor(
                  sortOrder,
                ),
              active:
                form.active,
            },
          );
        } else {
          await createFirebaseCategory(
            {
              name,
              slug:
                form.slug,
              icon:
                form.icon,
              image:
                form.image,
              sortOrder:
                Math.floor(
                  sortOrder,
                ),
              active:
                form.active,
            },
          );
        }

        setModalVisible(
          false,
        );

        setEditingCategory(
          null,
        );

        setForm(
          EMPTY_FORM,
        );
      } catch (error) {
        console.error(
          "Category save failed:",
          error,
        );

        showMessage(
          error instanceof Error
            ? error.message
            : "Unable to save category.",
        );
      } finally {
        setSaving(false);
      }
    };

  const handleToggle =
    async (
      category: FirebaseCategory,
    ) => {
      if (busyId) {
        return;
      }

      try {
        setBusyId(
          category.id,
        );

        await setFirebaseCategoryActive(
          category.id,
          !category.active,
        );
      } catch (error) {
        console.error(
          "Category status update failed:",
          error,
        );

        showMessage(
          "Unable to update category status.",
        );
      } finally {
        setBusyId(null);
      }
    };

  const handleDelete = (
    category: FirebaseCategory,
  ) => {
    const proceed =
      async () => {
        if (busyId) {
          return;
        }

        try {
          setBusyId(
            category.id,
          );

          await deleteFirebaseCategory(
            category.id,
          );
        } catch (error) {
          console.error(
            "Category delete failed:",
            error,
          );

          showMessage(
            error instanceof Error
              ? error.message
              : "Unable to delete category.",
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
      const confirmed =
        window.confirm(
          `Delete "${category.name}"?`,
        );

      if (
        confirmed
      ) {
        void proceed();
      }

      return;
    }

    Alert.alert(
      "Delete Category",
      `Delete "${category.name}"?`,
      [
        {
          text:
            "Cancel",
          style:
            "cancel",
        },
        {
          text:
            "Delete",
          style:
            "destructive",
          onPress: () =>
            void proceed(),
        },
      ],
    );
  };


  const handleInitializeCategories = async () => {
    if (initializing) return;

    const initialize = async () => {
      try {
        setInitializing(true);
        await initializeDefaultCategories();
        showMessage("6 default Raha Supermarket categories added successfully.");
      } catch (error) {
        console.error("Category initialization failed:", error);
        showMessage(
          error instanceof Error
            ? error.message
            : "Unable to initialize categories.",
        );
      } finally {
        setInitializing(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Initialize the 6 default Raha Supermarket categories?",
      );
      if (confirmed) await initialize();
      return;
    }

    Alert.alert(
      "Initialize Categories",
      "Add the 6 default Raha Supermarket categories?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Initialize", onPress: () => void initialize() },
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
            styles.headerTextWrap
          }
        >
          <Text
            style={
              styles.heading
            }
          >
            Category Management
          </Text>

          <Text
            style={
              styles.subheading
            }
          >
            Manage grocery categories
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
            size={23}
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
          label="Inactive"
          value={
            stats.inactive
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
          style={
            styles.searchInput
          }
          value={
            search
          }
          onChangeText={
            setSearch
          }
          placeholder="Search categories"
          placeholderTextColor={
            COLORS.textMuted
          }
        />

        {search ? (
          <TouchableOpacity
            onPress={() =>
              setSearch("")
            }
          >
            <Ionicons
              name="close-circle"
              size={21}
              color={
                COLORS.textMuted
              }
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {errorText ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={
              COLORS.danger
            }
          />

          <Text
            style={
              styles.errorText
            }
          >
            {errorText}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View
          style={
            styles.center
          }
        >
          <Text
            style={
              styles.loadingText
            }
          >
            Loading categoriesâ€¦
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            filteredCategories
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
                styles.emptyWrap
              }
            >
              <Ionicons
                name="grid-outline"
                size={48}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No categories found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Add your first store category.
              </Text>
              <TouchableOpacity
                style={[
                  styles.initializeButton,
                  initializing && styles.disabledButton,
                ]}
                onPress={() => void handleInitializeCategories()}
                disabled={initializing}
              >
                <Ionicons
                  name="flash-outline"
                  size={19}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.initializeButtonText}>
                  {initializing
                    ? "Initializing..."
                    : "Initialize Store Categories"}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({
            item,
          }) => (
            <CategoryCard
              category={
                item
              }
              busy={
                busyId ===
                item.id
              }
              onEdit={() =>
                openEditModal(
                  item,
                )
              }
              onDelete={() =>
                handleDelete(
                  item,
                )
              }
              onToggle={() =>
                handleToggle(
                  item,
                )
              }
            />
          )}
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
                    {editingCategory
                      ? "Edit Category"
                      : "Add Category"}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingCategory
                      ? editingCategory.id
                      : "Create a new store category"}
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
                label="Category Name"
                value={
                  form.name
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "name",
                    value,
                  )
                }
                placeholder="e.g. Dairy Products"
              />

              <Field
                label="Category ID / Slug"
                value={
                  form.slug
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "slug",
                    value,
                  )
                }
                placeholder="e.g. dairy"
                editable={
                  !editingCategory
                }
              />

              {editingCategory ? (
                <Text
                  style={
                    styles.helperText
                  }
                >
                  Existing category ID is locked to protect products already linked to it.
                </Text>
              ) : null}

              <Field
                label="Icon"
                value={
                  form.icon
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "icon",
                    value,
                  )
                }
                placeholder="grid-outline"
              />

              <Field
                label="Image URL"
                value={
                  form.image
                }
                onChangeText={(
                  value,
                ) =>
                  updateField(
                    "image",
                    value,
                  )
                }
                placeholder="https://..."
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
                placeholder="0"
                keyboardType="numeric"
              />

              <View
                style={
                  styles.switchRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.switchTitle
                    }
                  >
                    Active Category
                  </Text>

                  <Text
                    style={
                      styles.switchSubtitle
                    }
                  >
                    Inactive categories can later be hidden from customers.
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
                  style={
                    styles.cancelButton
                  }
                  onPress={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    void handleSave()
                  }
                  disabled={
                    saving
                  }
                >
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {saving
                      ? "Saving..."
                      : editingCategory
                        ? "Update Category"
                        : "Add Category"}
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

function CategoryCard({
  category,
  busy,
  onEdit,
  onDelete,
  onToggle,
}: {
  category: FirebaseCategory;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <View
      style={
        styles.categoryCard
      }
    >
      <View
        style={
          styles.categoryIconWrap
        }
      >
        <Ionicons
          name={
            (category.icon ||
              "grid-outline") as any
          }
          size={25}
          color={
            COLORS.primary
          }
        />
      </View>

      <View
        style={
          styles.categoryInfo
        }
      >
        <Text
          style={
            styles.categoryName
          }
        >
          {category.name}
        </Text>

        <Text
          style={
            styles.categoryMeta
          }
        >
          ID: {category.id} Â· Order {category.sortOrder}
        </Text>

        <Text
          style={[
            styles.statusText,
            !category.active &&
              styles.inactiveText,
          ]}
        >
          {category.active
            ? "Active"
            : "Inactive"}
        </Text>
      </View>

      <View
        style={
          styles.categoryActions
        }
      >
        <Switch
          value={
            category.active
          }
          onValueChange={
            onToggle
          }
          disabled={
            busy
          }
        />

        <TouchableOpacity
          style={
            styles.iconButton
          }
          onPress={
            onEdit
          }
          disabled={
            busy
          }
        >
          <Ionicons
            name="create-outline"
            size={21}
            color={
              COLORS.primary
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.iconButton
          }
          onPress={
            onDelete
          }
          disabled={
            busy
          }
        >
          <Ionicons
            name="trash-outline"
            size={21}
            color={
              COLORS.danger
            }
          />
        </TouchableOpacity>
      </View>
    </View>
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

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string,
  ) => void;
  placeholder: string;
  editable?: boolean;
  keyboardType?:
    | "default"
    | "numeric";
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
        style={[
          styles.fieldInput,
          !editable &&
            styles.fieldDisabled,
        ]}
        value={
          value
        }
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          COLORS.textMuted
        }
        editable={
          editable
        }
        keyboardType={
          keyboardType
        }
      />
    </View>
  );
}

function showMessage(
  message: string,
) {
  if (
    Platform.OS ===
    "web"
  ) {
    window.alert(
      message,
    );
    return;
  }

  Alert.alert(
    "Raha Supermarket",
    message,
  );
}

const styles =
   StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F4F7FB",
    },

    /* ---------- PREMIUM HEADER ---------- */
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
      backgroundColor: "#FFFFFF",
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
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F1F5F9",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },

    headerTextWrap: {
      flex: 1,
    },

    heading: {
      fontSize: 22,
      fontWeight: "900",
      color: "#0F172A",
      letterSpacing: -0.4,
    },

    subheading: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: "500",
      color: "#64748B",
    },

    addButton: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#D69E2E",
      shadowColor: "#D69E2E",
      shadowOpacity: 0.25,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 3,
    },

    /* ---------- STATS ---------- */
    statsRow: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 18,
    },

    statCard: {
      flex: 1,
      minHeight: 96,
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      alignItems: "flex-start",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      shadowColor: "#0F172A",
      shadowOpacity: 0.055,
      shadowRadius: 14,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 2,
    },

    statValue: {
      fontSize: 25,
      fontWeight: "900",
      color: "#102A43",
      letterSpacing: -0.7,
    },

    statLabel: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: "700",
      color: "#64748B",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    /* ---------- SEARCH ---------- */
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: "#DDE5EF",
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      paddingHorizontal: 16,
      minHeight: 52,
      gap: 10,
      shadowColor: "#0F172A",
      shadowOpacity: 0.035,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 1,
    },

    searchInput: {
      flex: 1,
      color: "#0F172A",
      fontSize: 14,
      fontWeight: "500",
    },

    /* ---------- ERROR ---------- */
    errorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 14,
      padding: 14,
      backgroundColor: "#FFF1F2",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#FECDD3",
    },

    errorText: {
      flex: 1,
      color: "#BE123C",
      fontSize: 13,
      fontWeight: "600",
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      color: "#64748B",
      fontWeight: "600",
    },

    /* ---------- CATEGORY LIST ---------- */
    list: {
      paddingHorizontal: 20,
      paddingBottom: 50,
    },

    categoryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#E1E8F0",
      shadowColor: "#0F172A",
      shadowOpacity: 0.06,
      shadowRadius: 15,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 2,
    },

    categoryIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#E8F7F3",
      borderWidth: 1,
      borderColor: "#CBE9E1",
    },

    categoryInfo: {
      flex: 1,
      marginLeft: 15,
    },

    categoryName: {
      fontSize: 16,
      fontWeight: "900",
      color: "#0F172A",
    },

    categoryMeta: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: "500",
      color: "#64748B",
    },

    statusText: {
      alignSelf: "flex-start",
      marginTop: 8,
      fontSize: 10,
      fontWeight: "800",
      color: "#087A5A",
      backgroundColor: "#E7F8F1",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      overflow: "hidden",
    },

    inactiveText: {
      color: "#64748B",
      backgroundColor: "#EEF2F6",
    },

    categoryActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    iconButton: {
      width: 39,
      height: 39,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },

    /* ---------- EMPTY STATE ---------- */
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      paddingHorizontal: 24,
    },

    emptyTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "900",
      color: "#0F172A",
    },

    emptyText: {
      marginTop: 6,
      fontSize: 13,
      color: "#64748B",
      textAlign: "center",
    },

    initializeButton: {
      marginTop: 20,
      minHeight: 48,
      paddingHorizontal: 20,
      borderRadius: 13,
      backgroundColor: "#102A43",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      shadowColor: "#102A43",
      shadowOpacity: 0.16,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 2,
    },

    initializeButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },

    /* ---------- MODAL ---------- */
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.64)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },

    modalCard: {
      width: "100%",
      maxWidth: 580,
      maxHeight: "90%",
      backgroundColor: "#FFFFFF",
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      shadowColor: "#000000",
      shadowOpacity: 0.18,
      shadowRadius: 28,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      elevation: 8,
    },

    modalContent: {
      padding: 24,
    },

    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 22,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor: "#E8EDF3",
    },

    modalTitle: {
      fontSize: 21,
      fontWeight: "900",
      color: "#0F172A",
      letterSpacing: -0.3,
    },

    modalSubtitle: {
      marginTop: 5,
      fontSize: 11,
      color: "#64748B",
    },

    /* ---------- FORM ---------- */
    fieldWrap: {
      marginBottom: 16,
    },

    fieldLabel: {
      marginBottom: 7,
      fontSize: 12,
      fontWeight: "800",
      color: "#334155",
    },

    fieldInput: {
      borderWidth: 1,
      borderColor: "#DDE5EF",
      borderRadius: 13,
      backgroundColor: "#F8FAFC",
      minHeight: 50,
      paddingHorizontal: 15,
      color: "#0F172A",
      fontSize: 14,
    },

    fieldDisabled: {
      opacity: 0.58,
      backgroundColor: "#EEF2F6",
    },

    helperText: {
      marginTop: -7,
      marginBottom: 16,
      fontSize: 11,
      lineHeight: 16,
      color: "#64748B",
    },

    /* ---------- ACTIVE SWITCH ---------- */
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 5,
      padding: 15,
      borderWidth: 1,
      borderColor: "#DDE5EF",
      borderRadius: 14,
      backgroundColor: "#F8FAFC",
    },

    switchTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: "#0F172A",
    },

    switchSubtitle: {
      marginTop: 4,
      maxWidth: 360,
      fontSize: 11,
      lineHeight: 16,
      color: "#64748B",
    },

    /* ---------- MODAL ACTIONS ---------- */
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 22,
    },

    cancelButton: {
      flex: 1,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#FFFFFF",
    },

    cancelButtonText: {
      color: "#475569",
      fontWeight: "800",
    },

    saveButton: {
      flex: 1,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: "#102A43",
      shadowColor: "#102A43",
      shadowOpacity: 0.17,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 2,
    },

    saveButtonText: {
      color: "#FFFFFF",
      fontWeight: "900",
    },

    disabledButton: {
      opacity: 0.5,
    },
  });
