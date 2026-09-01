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
import { useRouter } from "expo-router";

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
            Loading categories…
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
          ID: {category.id} · Order {category.sortOrder}
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
      backgroundColor:
        COLORS.background,
    },

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        SPACING.lg,
      paddingVertical:
        SPACING.md,
      gap:
        SPACING.md,
      backgroundColor:
        COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.background,
    },

    headerTextWrap: {
      flex: 1,
    },

    heading: {
      fontSize: 22,
      fontWeight:
        "700",
      color:
        COLORS.textPrimary,
    },

    subheading: {
      marginTop: 2,
      fontSize: 13,
      color:
        COLORS.textSecondary,
    },

    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
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
      gap:
        SPACING.sm,
      paddingHorizontal:
        SPACING.lg,
      paddingTop:
        SPACING.lg,
    },

    statCard: {
      flex: 1,
      backgroundColor:
        COLORS.surface,
      borderRadius:
        RADIUS.md,
      padding:
        SPACING.md,
      alignItems:
        "center",
      ...SHADOW.card,
    },

    statValue: {
      fontSize: 22,
      fontWeight:
        "700",
      color:
        COLORS.primary,
    },

    statLabel: {
      marginTop: 4,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    searchWrap: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginHorizontal:
        SPACING.lg,
      marginVertical:
        SPACING.md,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.surface,
      borderRadius:
        RADIUS.md,
      paddingHorizontal:
        SPACING.md,
      minHeight: 48,
      gap:
        SPACING.sm,
    },

    searchInput: {
      flex: 1,
      color:
        COLORS.textPrimary,
      fontSize: 15,
    },

    errorCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        SPACING.sm,
      marginHorizontal:
        SPACING.lg,
      marginBottom:
        SPACING.md,
      padding:
        SPACING.md,
      backgroundColor:
        COLORS.surface,
      borderRadius:
        RADIUS.md,
      borderWidth: 1,
      borderColor:
        COLORS.danger,
    },

    errorText: {
      flex: 1,
      color:
        COLORS.danger,
      fontSize: 13,
    },

    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingText: {
      color:
        COLORS.textSecondary,
    },

    list: {
      paddingHorizontal:
        SPACING.lg,
      paddingBottom: 40,
    },

    categoryCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        COLORS.surface,
      borderRadius:
        RADIUS.lg,
      padding:
        SPACING.md,
      marginBottom:
        SPACING.md,
      ...SHADOW.card,
    },

    categoryIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.background,
    },

    categoryInfo: {
      flex: 1,
      marginLeft:
        SPACING.md,
    },

    categoryName: {
      fontSize: 16,
      fontWeight:
        "700",
      color:
        COLORS.textPrimary,
    },

    categoryMeta: {
      marginTop: 4,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    statusText: {
      marginTop: 5,
      fontSize: 12,
      fontWeight:
        "600",
      color:
        COLORS.primary,
    },

    inactiveText: {
      color:
        COLORS.textMuted,
    },

    categoryActions: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
    },

    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.background,
    },

    emptyWrap: {
      alignItems:
        "center",
      paddingTop: 80,
    },

    emptyTitle: {
      marginTop:
        SPACING.md,
      fontSize: 17,
      fontWeight:
        "700",
      color:
        COLORS.textPrimary,
    },

    emptyText: {
      marginTop: 5,
      color:
        COLORS.textSecondary,
    },
    initializeButton: {
      marginTop: SPACING.lg,
      minHeight: 48,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
    },

    initializeButtonText: {
      color: COLORS.textOnPrimary,
      fontSize: 14,
      fontWeight: "700",
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.45)",
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 20,
    },

    modalCard: {
      width: "100%",
      maxWidth: 560,
      maxHeight: "90%",
      backgroundColor:
        COLORS.surface,
      borderRadius:
        RADIUS.lg,
      overflow:
        "hidden",
    },

    modalContent: {
      padding:
        SPACING.lg,
    },

    modalHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      marginBottom:
        SPACING.lg,
    },

    modalTitle: {
      fontSize: 20,
      fontWeight:
        "700",
      color:
        COLORS.textPrimary,
    },

    modalSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    fieldWrap: {
      marginBottom:
        SPACING.md,
    },

    fieldLabel: {
      marginBottom: 6,
      fontSize: 13,
      fontWeight:
        "600",
      color:
        COLORS.textPrimary,
    },

    fieldInput: {
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      backgroundColor:
        COLORS.background,
      minHeight: 48,
      paddingHorizontal:
        SPACING.md,
      color:
        COLORS.textPrimary,
    },

    fieldDisabled: {
      opacity: 0.6,
    },

    helperText: {
      marginTop: -6,
      marginBottom:
        SPACING.md,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    switchRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop:
        SPACING.sm,
      paddingVertical:
        SPACING.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        COLORS.border,
    },

    switchTitle: {
      fontSize: 14,
      fontWeight:
        "600",
      color:
        COLORS.textPrimary,
    },

    switchSubtitle: {
      marginTop: 3,
      maxWidth: 360,
      fontSize: 12,
      color:
        COLORS.textSecondary,
    },

    modalActions: {
      flexDirection:
        "row",
      gap:
        SPACING.md,
      marginTop:
        SPACING.lg,
    },

    cancelButton: {
      flex: 1,
      minHeight: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        RADIUS.md,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    cancelButtonText: {
      color:
        COLORS.textPrimary,
      fontWeight:
        "600",
    },

    saveButton: {
      flex: 1,
      minHeight: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        RADIUS.md,
      backgroundColor:
        COLORS.primary,
    },

    saveButtonText: {
      color:
        COLORS.textOnPrimary,
      fontWeight:
        "700",
    },

    disabledButton: {
      opacity: 0.55,
    },
  });