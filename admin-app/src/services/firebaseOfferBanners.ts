import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/src/config/firebase";

export type OfferBanner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  route: string;
  startDate: string;
  endDate: string;
  active: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type OfferBannerInput = Omit<OfferBanner, "id" | "createdAt" | "updatedAt">;

const COLLECTION = "offerBanners";
const offerBannersRef = collection(db, COLLECTION);

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(value + "T00:00:00").getTime());
}

function normalize(input: OfferBannerInput): OfferBannerInput {
  const title = input.title.trim();
  const subtitle = input.subtitle.trim();
  const cta = input.cta.trim() || "Shop Now";
  const image = input.image.trim();
  const route = input.route.trim() || "/products";
  const startDate = input.startDate.trim();
  const endDate = input.endDate.trim();

  if (!title) throw new Error("Offer title is required.");
  if (!subtitle) throw new Error("Offer subtitle is required.");
  if (!/^https?:\/\//i.test(image)) throw new Error("Enter a valid http/https banner image URL.");
  if (!validDate(startDate) || !validDate(endDate)) {
    throw new Error("Start and end dates must use YYYY-MM-DD.");
  }
  if (new Date(startDate + "T00:00:00").getTime() > new Date(endDate + "T23:59:59").getTime()) {
    throw new Error("End date cannot be before start date.");
  }

  return {
    title,
    subtitle,
    cta,
    image,
    route,
    startDate,
    endDate,
    active: input.active !== false,
    sortOrder: Math.max(0, Math.floor(Number(input.sortOrder) || 0)),
  };
}

function mapOffer(id: string, data: Record<string, any>): OfferBanner {
  return {
    id,
    title: String(data.title ?? ""),
    subtitle: String(data.subtitle ?? ""),
    cta: String(data.cta ?? "Shop Now"),
    image: String(data.image ?? ""),
    route: String(data.route ?? "/products"),
    startDate: String(data.startDate ?? ""),
    endDate: String(data.endDate ?? ""),
    active: data.active !== false,
    sortOrder: Math.max(0, Math.floor(Number(data.sortOrder) || 0)),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function isOfferLive(offer: Pick<OfferBanner, "active" | "startDate" | "endDate">): boolean {
  if (!offer.active || !validDate(offer.startDate) || !validDate(offer.endDate)) return false;
  const now = Date.now();
  return (
    now >= new Date(offer.startDate + "T00:00:00").getTime() &&
    now <= new Date(offer.endDate + "T23:59:59").getTime()
  );
}

export function subscribeToOfferBanners(
  callback: (offers: OfferBanner[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(offerBannersRef, orderBy("sortOrder", "asc")),
    (snapshot) => callback(snapshot.docs.map((item) => mapOffer(item.id, item.data()))),
    (error) => {
      console.error("[OfferBanners] Firestore listener failed:", error);
      onError?.(error instanceof Error ? error : new Error("Unable to load offer banners."));
    },
  );
}

export async function createOfferBanner(input: OfferBannerInput): Promise<string> {
  const ref = await addDoc(offerBannersRef, {
    ...normalize(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateOfferBanner(id: string, input: OfferBannerInput): Promise<void> {
  if (!id.trim()) throw new Error("Offer ID is required.");
  await updateDoc(doc(db, COLLECTION, id), {
    ...normalize(input),
    updatedAt: serverTimestamp(),
  });
}

export async function setOfferBannerActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOfferBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
