import { Platform } from "react-native";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/src/config/firebase";

export type UploadedProductImage = {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function sanitizePathPart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  return "jpg";
}

/**
 * Core uploader. Reads the local/remote URI (or web File) into a Blob and
 * uploads it to Firebase Storage under products/<productKey>/<timestamp>-<name>.
 * Returns the public download URL. Existing http(s) image URLs on old products
 * are untouched and keep working — only NEW uploads use Firebase Storage.
 */
async function uploadProductImage(
  productKey: string,
  uri: string,
  fileName: string,
  mimeType: string,
  size: number,
  webFile?: File,
): Promise<UploadedProductImage> {
  if (!mimeType.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  if (size > MAX_IMAGE_BYTES) {
    throw new Error("Product image must be 5 MB or smaller.");
  }

  const safeProductKey = sanitizePathPart(productKey);
  const safeFileName = sanitizePathPart(fileName);
  const storageRef = ref(
    storage,
    `products/${safeProductKey}/${Date.now()}-${safeFileName}`,
  );

  let uploadData: Blob;

  if (Platform.OS === "web" && webFile) {
    uploadData = webFile;
  } else {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("Unable to read the selected product image.");
    }
    uploadData = await response.blob();
  }

  const uploadedSnapshot = await uploadBytes(storageRef, uploadData, {
    contentType: mimeType,
  });
  const url = await getDownloadURL(uploadedSnapshot.ref);

  return {
    url,
    fileName,
    size: uploadedSnapshot.metadata.size || size,
    mimeType: uploadedSnapshot.metadata.contentType || mimeType,
  };
}

/**
 * Pick a local file (web = local drive, native = Files browser) and upload.
 * Used by web/laptop "Choose Local Image" and by the single-product form.
 */
export async function pickAndUploadProductImage(
  productKey: string,
): Promise<UploadedProductImage | null> {
  const DocumentPicker = await import("expo-document-picker");

  const result = await DocumentPicker.getDocumentAsync({
    type: "image/*",
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    return null;
  }

  const mimeType = asset.mimeType || "image/jpeg";
  const size = asset.size || 0;
  const fileName =
    asset.name || `product-image.${extensionForMimeType(mimeType)}`;

  return uploadProductImage(
    productKey,
    asset.uri,
    fileName,
    mimeType,
    size,
    Platform.OS === "web" ? asset.file : undefined,
  );
}

/**
 * Pick an image from the device photo gallery (Android/iOS) and upload.
 */
export async function pickGalleryAndUploadProductImage(
  productKey: string,
): Promise<UploadedProductImage | null> {
  const ImagePicker = await import("expo-image-picker");

  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Photo library permission is required to choose a product image.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    return null;
  }

  const mimeType = asset.mimeType || "image/jpeg";
  const size = asset.fileSize || 0;
  const fileName =
    asset.fileName || `gallery-${Date.now()}.${extensionForMimeType(mimeType)}`;

  return uploadProductImage(
    productKey,
    asset.uri,
    fileName,
    mimeType,
    size,
    Platform.OS === "web" ? (asset.file as File | undefined) : undefined,
  );
}

/**
 * Take a photo with the device camera (Android/iOS) and upload.
 */
export async function takeAndUploadProductImage(
  productKey: string,
): Promise<UploadedProductImage | null> {
  const ImagePicker = await import("expo-image-picker");

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Camera permission is required to take a product photo.",
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    return null;
  }

  const mimeType = asset.mimeType || "image/jpeg";
  const size = asset.fileSize || 0;
  const fileName =
    asset.fileName || `camera-${Date.now()}.${extensionForMimeType(mimeType)}`;

  return uploadProductImage(
    productKey,
    asset.uri,
    fileName,
    mimeType,
    size,
  );
}
