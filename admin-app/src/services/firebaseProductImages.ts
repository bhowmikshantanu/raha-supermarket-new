import { Platform } from "react-native";

export type UploadedProductImage = {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
};

const CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();

const UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function pickAndUploadProductImage(
  _productKey: string,
): Promise<UploadedProductImage | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary configuration is missing. Check the admin-app .env file.",
    );
  }

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

  if (!mimeType.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  if (size > MAX_IMAGE_BYTES) {
    throw new Error(
      "Product image must be 5 MB or smaller.",
    );
  }

  const formData = new FormData();

  formData.append("upload_preset", UPLOAD_PRESET);

  if (Platform.OS === "web" && asset.file) {
    formData.append("file", asset.file);
  } else {
    formData.append(
      "file",
      {
        uri: asset.uri,
        name: asset.name || "product-image.jpg",
        type: mimeType,
      } as any,
    );
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Cloudinary upload error:",
      data,
    );

    throw new Error(
      data?.error?.message ||
        "Unable to upload product image.",
    );
  }

  if (
    !data.secure_url ||
    typeof data.secure_url !== "string"
  ) {
    throw new Error(
      "Cloudinary did not return an image URL.",
    );
  }

  return {
    url: data.secure_url,
    fileName:
      asset.name ||
      `${data.public_id || "product"}.${data.format || "jpg"}`,
    size:
      typeof data.bytes === "number"
        ? data.bytes
        : size,
    mimeType:
      typeof data.resource_type === "string" &&
      typeof data.format === "string"
        ? `image/${data.format}`
        : mimeType,
  };
}