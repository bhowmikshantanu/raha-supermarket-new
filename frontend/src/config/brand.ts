// Central brand configuration — change these values to rebrand the app.
// TODO: In future phases, this can be fetched from a backend config endpoint.

export const BRAND = {
  name: "Raha Supermarket",
  tagline: "Daily Needs, Delivered Nearby",
  address: "Ward No. 8, Gularbhoj Road",
  shortAddress: "Gularbhoj Road",
  whatsapp: "8130011378",
  whatsappDisplay: "+91 81300 11378",
  storeHours: {
    open: 10, // 10:00 AM (24hr)
    close: 20, // 8:00 PM
    displayText: "10:00 AM – 8:00 PM",
  },
  delivery: {
    radiusKm: 2,
    fee: 50,
    freeThreshold: 500,
    estimatedMinutes: 30,
  },
  payment: {
    codEnabled: true,
    onlineEnabled: false, // Phase 1 — Coming Soon
  },
  currency: {
    code: "INR",
    symbol: "₹",
  },
  country: {
    code: "IN",
    phonePrefix: "+91",
  },
  logoLetter: "R",
};
