import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { uploadOfferBannerImage } from "@/src/services/firebaseOfferImages";
import {
  createOfferBanner,
  deleteOfferBanner,
  isOfferLive,
  setOfferBannerActive,
  subscribeToOfferBanners,
  updateOfferBanner,
  type OfferBanner,
} from "@/src/services/firebaseOfferBanners";

type FormState = {
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  route: string;
  startDate: string;
  endDate: string;
  sortOrder: string;
  active: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: FormState = {
  title: "",
  subtitle: "",
  cta: "Shop Now",
  image: "",
  route: "/products",
  startDate: today(),
  endDate: "2028-12-31",
  sortOrder: "1",
  active: true,
};

function message(value: string) {
  if (Platform.OS === "web") window.alert(value);
  else Alert.alert("Offer Banners", value);
}

function Field({ label, value, onChangeText, placeholder, multiline = false }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export default function AdminOffersScreen() {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<OfferBanner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribeToOfferBanners(
    (items) => { setOffers(items); setLoading(false); },
    () => { setLoading(false); message("Unable to load offer banners from Firebase."); },
  ), []);

  const liveCount = useMemo(() => offers.filter(isOfferLive).length, [offers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, startDate: today(), sortOrder: String(offers.length + 1) });
    setModal(true);
  };

  const openEdit = (offer: OfferBanner) => {
    setEditing(offer);
    setForm({
      title: offer.title,
      subtitle: offer.subtitle,
      cta: offer.cta,
      image: offer.image,
      route: offer.route,
      startDate: offer.startDate,
      endDate: offer.endDate,
      sortOrder: String(offer.sortOrder),
      active: offer.active,
    });
    setModal(true);
  };

  const chooseBannerImage = async () => {
    try {
      setUploadingImage(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        message("Please allow photo access to choose an offer banner.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 7],
        quality: 0.88,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const url = await uploadOfferBannerImage(
        asset.uri,
        asset.fileName ?? "offer-banner.jpg",
        asset.mimeType ?? "image/jpeg",
      );

      setForm((current) => ({ ...current, image: url }));
    } catch (error) {
      message(error instanceof Error ? error.message : "Unable to upload banner image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        cta: form.cta,
        image: form.image,
        route: form.route,
        startDate: form.startDate,
        endDate: form.endDate,
        sortOrder: Number(form.sortOrder || 0),
        active: form.active,
      };
      if (editing) await updateOfferBanner(editing.id, payload);
      else await createOfferBanner(payload);
      setModal(false);
      setEditing(null);
    } catch (error) {
      message(error instanceof Error ? error.message : "Unable to save offer.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (offer: OfferBanner) => {
    const run = async () => {
      try { setBusy(offer.id); await deleteOfferBanner(offer.id); }
      catch { message("Unable to delete offer."); }
      finally { setBusy(null); }
    };
    if (Platform.OS === "web") {
      if (window.confirm('Delete offer "' + offer.title + '"?')) void run();
    } else {
      Alert.alert("Delete Offer", 'Delete "' + offer.title + '"?', [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void run() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={23} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Home Offer Banners</Text>
          <Text style={styles.subtitle}>Control the live rotating offers on the customer home screen</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={19} color="#FFFFFF" />
          <Text style={styles.addText}>Add Offer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{offers.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{liveCount}</Text><Text style={styles.statLabel}>Live Now</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{offers.filter((x) => x.active).length}</Text><Text style={styles.statLabel}>Enabled</Text></View>
      </View>

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? "Loading offers..." : "No dynamic offers yet. Tap Add Offer to publish one."}</Text>}
        renderItem={({ item }) => {
          const live = isOfferLive(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{live ? "LIVE NOW" : item.active ? "SCHEDULED / EXPIRED" : "INACTIVE"}</Text></View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  <Text style={styles.meta}>{item.startDate} → {item.endDate} · Order {item.sortOrder}</Text>
                </View>
                <Switch
                  value={item.active}
                  disabled={busy === item.id}
                  onValueChange={async (value) => {
                    try { setBusy(item.id); await setOfferBannerActive(item.id, value); }
                    catch { message("Unable to update offer status."); }
                    finally { setBusy(null); }
                  }}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editButton} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={17} color={COLORS.primary} />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => remove(item)}>
                  <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => !saving && setModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "Edit Offer Banner" : "Add Offer Banner"}</Text>
              <TouchableOpacity onPress={() => !saving && setModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[1]}
              keyExtractor={() => "form"}
              renderItem={() => (
                <View>
                  <Field label="Offer title" value={form.title} onChangeText={(v) => setForm((x) => ({ ...x, title: v }))} placeholder="Weekend Grocery Sale" />
                  <Field label="Offer text" value={form.subtitle} onChangeText={(v) => setForm((x) => ({ ...x, subtitle: v }))} placeholder="Save more on selected essentials" multiline />
                  <Field label="Button text" value={form.cta} onChangeText={(v) => setForm((x) => ({ ...x, cta: v }))} placeholder="Shop Now" />
                  <View style={styles.field}>
                    <Text style={styles.label}>Banner image</Text>
                    <TouchableOpacity
                      style={styles.imagePicker}
                      disabled={uploadingImage}
                      onPress={() => void chooseBannerImage()}
                    >
                      {form.image ? (
                        <Image source={{ uri: form.image }} style={styles.imagePreview} contentFit="cover" />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="image-outline" size={30} color={COLORS.primary} />
                          <Text style={styles.imagePickerTitle}>{uploadingImage ? "Uploading..." : "Choose image"}</Text>
                          <Text style={styles.imagePickerText}>Select from computer or phone gallery</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {form.image ? (
                      <TouchableOpacity disabled={uploadingImage} style={styles.changeImageButton} onPress={() => void chooseBannerImage()}>
                        <Ionicons name="cloud-upload-outline" size={17} color={COLORS.primary} />
                        <Text style={styles.changeImageText}>{uploadingImage ? "Uploading..." : "Change image"}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <Field label="Open route" value={form.route} onChangeText={(v) => setForm((x) => ({ ...x, route: v }))} placeholder="/products?filter=offers" />
                  <View style={styles.dateRow}>
                    <View style={styles.dateField}><Field label="Start date" value={form.startDate} onChangeText={(v) => setForm((x) => ({ ...x, startDate: v }))} placeholder="YYYY-MM-DD" /></View>
                    <View style={styles.dateField}><Field label="End date" value={form.endDate} onChangeText={(v) => setForm((x) => ({ ...x, endDate: v }))} placeholder="YYYY-MM-DD" /></View>
                  </View>
                  <Field label="Display order" value={form.sortOrder} onChangeText={(v) => setForm((x) => ({ ...x, sortOrder: v }))} placeholder="1" />
                  <View style={styles.activeRow}><Text style={styles.label}>Active</Text><Switch value={form.active} onValueChange={(v) => setForm((x) => ({ ...x, active: v }))} trackColor={{ true: COLORS.primary }} /></View>
                  <TouchableOpacity style={styles.saveButton} disabled={saving || uploadingImage} onPress={() => void save()}>
                    <Text style={styles.saveText}>{uploadingImage ? "Uploading image..." : saving ? "Saving..." : editing ? "Save Changes" : "Publish Offer"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  headerText: { flex: 1 },
  title: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.maroon },
  subtitle: { marginTop: 2, fontSize: FONT.size.xs, color: COLORS.textSecondary },
  addButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: RADIUS.pill },
  addText: { color: "#FFFFFF", fontWeight: FONT.weight.bold, fontSize: FONT.size.sm },
  stats: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.md },
  stat: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOW.card },
  statValue: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.heavy, color: COLORS.primary },
  statLabel: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginTop: 2 },
  list: { padding: SPACING.md, paddingTop: 0, gap: SPACING.sm },
  empty: { textAlign: "center", color: COLORS.textSecondary, padding: SPACING.xl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOW.card },
  cardTop: { flexDirection: "row", gap: SPACING.md },
  cardCopy: { flex: 1 },
  badge: { alignSelf: "flex-start", backgroundColor: COLORS.saffronLight, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 7 },
  badgeText: { color: COLORS.primary, fontSize: 9, fontWeight: FONT.weight.heavy },
  cardTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  cardSubtitle: { marginTop: 4, color: COLORS.textSecondary, fontSize: FONT.size.sm },
  meta: { marginTop: 7, color: COLORS.textMuted, fontSize: FONT.size.xs },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  editButton: { flexDirection: "row", gap: 5, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight },
  editText: { color: COLORS.primary, fontWeight: FONT.weight.semibold },
  deleteButton: { flexDirection: "row", gap: 5, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: "#FFF1F1" },
  deleteText: { color: COLORS.danger, fontWeight: FONT.weight.semibold },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: SPACING.md },
  modalCard: { maxHeight: "92%", width: "100%", maxWidth: 720, alignSelf: "center", backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md },
  modalTitle: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.maroon },
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.textPrimary, marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.background },
  multiline: { minHeight: 78, paddingTop: 12, textAlignVertical: "top" },
  imagePicker: { height: 190, borderWidth: 1.5, borderStyle: "dashed", borderColor: COLORS.primary, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: COLORS.primaryLight },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.md },
  imagePickerTitle: { marginTop: 8, color: COLORS.primary, fontSize: FONT.size.md, fontWeight: FONT.weight.bold },
  imagePickerText: { marginTop: 3, color: COLORS.textSecondary, fontSize: FONT.size.xs },
  changeImageButton: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight },
  changeImageText: { color: COLORS.primary, fontWeight: FONT.weight.semibold },
  dateRow: { flexDirection: "row", gap: SPACING.sm },
  dateField: { flex: 1 },
  activeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", marginBottom: SPACING.md },
  saveText: { color: "#FFFFFF", fontWeight: FONT.weight.bold, fontSize: FONT.size.md },
});
