import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/src/config/firebase";

function safeExtension(name: string, mimeType: string): string {
  const fromName = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export async function uploadOfferBannerImage(
  uri: string,
  fileName = "offer-banner.jpg",
  mimeType = "image/jpeg",
): Promise<string> {
  if (!uri) throw new Error("Please choose a banner image.");

  const response = await fetch(uri);
  if (!response.ok) throw new Error("Unable to read the selected image.");

  const blob = await response.blob();
  const extension = safeExtension(fileName, mimeType || blob.type || "image/jpeg");
  const path = `offer-banners/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
  const imageRef = ref(storage, path);

  await uploadBytes(imageRef, blob, {
    contentType: mimeType || blob.type || "image/jpeg",
  });

  return getDownloadURL(imageRef);
}
