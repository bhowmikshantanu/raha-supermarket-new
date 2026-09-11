import type { Product } from "@/src/types";

// Curated placeholder product images from Unsplash / Pexels.
const IMG = {
  nutella:
    "https://images.unsplash.com/photo-1584053386451-f078fff801ae?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxudXRlbGxhJTIwamFyfGVufDB8fHx8MTc4NDU0MzU2MHww&ixlib=rb-4.1.0&q=85",
  detergent:
    "https://images.unsplash.com/photo-1585970480901-90d087b8b5cd?auto=format&fit=crop&w=800&q=80",
  refinedOil:
    "https://images.pexels.com/photos/12284682/pexels-photo-12284682.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  mustardOil:
    "https://images.unsplash.com/photo-1620705992848-3c8c0a03fb70?auto=format&fit=crop&w=800&q=80",
  butter:
    "https://images.pexels.com/photos/7965940/pexels-photo-7965940.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  cheese:
    "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80",
  biscuit:
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80",
  dairyMilk:
    "https://images.unsplash.com/photo-1623660053975-cf75a8be0908?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxjaG9jb2xhdGUlMjBiYXJ8ZW58MHx8fHwxNzg0NTQzNTYwfDA&ixlib=rb-4.1.0&q=85",
  kitkat:
    "https://images.unsplash.com/photo-1614088685112-0a760b71a3c8?auto=format&fit=crop&w=800&q=80",
  bread:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
  cola: "https://images.unsplash.com/photo-1648569883125-d01072540b4c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwxfHxjb2xhJTIwYm90dGxlfGVufDB8fHx8MTc4NDU0MzU2MHww&ixlib=rb-4.1.0&q=85",
  salt: "https://images.unsplash.com/photo-1518110925495-b37653dd3f4a?auto=format&fit=crop&w=800&q=80",
  rockSalt:
    "https://images.unsplash.com/photo-1587049633312-d628ae50a8ae?auto=format&fit=crop&w=800&q=80",
  ketchup:
    "https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?auto=format&fit=crop&w=800&q=80",
  honey:
    "https://images.unsplash.com/photo-1587049352851-8d4e89133924?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHxob25leSUyMGphcnxlbnwwfHx8fDE3ODQ1NDM1NjB8MA&ixlib=rb-4.1.0&q=85",
};

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Nutella Hazelnut Spread",
    category: "grocery-staples",
    size: "350 g",
    mrp: 399,
    price: 365,
    stock: 10,
    image: IMG.nutella,
    description:
      "Smooth and creamy hazelnut spread with cocoa. Perfect on toast, pancakes or straight from the jar.",
    isFeatured: true,
    isBestOffer: true,
  },
  {
    id: "p2",
    name: "Ezee Liquid Detergent",
    category: "household",
    size: "1 kg",
    mrp: 230,
    price: 210,
    stock: 12,
    image: IMG.detergent,
    description:
      "Gentle liquid detergent for woollens and delicate fabrics. Cleans without harming fibres.",
    isBestOffer: true,
  },
  {
    id: "p3",
    name: "Fortune Refined Oil",
    category: "grocery-staples",
    size: "1 L",
    mrp: 155,
    price: 145,
    stock: 20,
    image: IMG.refinedOil,
    description:
      "Refined sunflower oil rich in Vitamin A, D & E. Light and healthy for everyday Indian cooking.",
    isFeatured: true,
    isPopular: true,
  },
  {
    id: "p4",
    name: "Scooter Mustard Oil",
    category: "grocery-staples",
    size: "1 L",
    mrp: 190,
    price: 175,
    stock: 15,
    image: IMG.mustardOil,
    description:
      "Traditional kachi ghani mustard oil with a strong pungent aroma. Great for tadka and pickles.",
    isPopular: true,
  },
  {
    id: "p5",
    name: "Amul Butter",
    category: "dairy",
    size: "100 g",
    mrp: 60,
    price: 58,
    stock: 25,
    image: IMG.butter,
    description:
      "The taste of India. Creamy, salted table butter made from pure milk fat.",
    isFeatured: true,
    isPopular: true,
  },
  {
    id: "p6",
    name: "Amul Cheese Slices",
    category: "dairy",
    size: "200 g",
    mrp: 145,
    price: 135,
    stock: 10,
    image: IMG.cheese,
    description:
      "10 individually wrapped processed cheese slices. Perfect for sandwiches and burgers.",
  },
  {
    id: "p7",
    name: "Good Day Biscuits",
    category: "snacks-biscuits",
    size: "200 g",
    mrp: 40,
    price: 36,
    stock: 30,
    image: IMG.biscuit,
    description:
      "Rich butter cookies from Britannia. Buttery, crumbly and full of goodness.",
    isPopular: true,
  },
  {
    id: "p8",
    name: "Cadbury Dairy Milk",
    category: "snacks-biscuits",
    size: "50 g",
    mrp: 50,
    price: 48,
    stock: 25,
    image: IMG.dairyMilk,
    description:
      "Classic silky smooth milk chocolate. A little treat that goes with every mood.",
    isFeatured: true,
  },
  {
    id: "p9",
    name: "KitKat",
    category: "snacks-biscuits",
    size: "38.5 g",
    mrp: 30,
    price: 28,
    stock: 20,
    image: IMG.kitkat,
    description:
      "Crispy wafer fingers covered in smooth milk chocolate. Have a break, have a KitKat.",
  },
  {
    id: "p10",
    name: "Fresh Bread",
    category: "snacks-biscuits",
    size: "400 g",
    mrp: 45,
    price: 42,
    stock: 15,
    image: IMG.bread,
    description:
      "Soft freshly baked white sandwich bread. Delivered fresh from the local bakery.",
  },
  {
    id: "p11",
    name: "Coca-Cola",
    category: "beverages",
    size: "750 ml",
    mrp: 45,
    price: 42,
    stock: 24,
    image: IMG.cola,
    description:
      "The original refreshing cola drink. Best served chilled.",
    isPopular: true,
    isBestOffer: true,
  },
  {
    id: "p12",
    name: "Tata Salt",
    category: "grocery-staples",
    size: "1 kg",
    mrp: 28,
    price: 26,
    stock: 40,
    image: IMG.salt,
    description:
      "India's most trusted iodised salt. Free flowing and vacuum evaporated.",
    isPopular: true,
  },
  {
    id: "p13",
    name: "Patanjali Rock Salt",
    category: "grocery-staples",
    size: "1 kg",
    mrp: 40,
    price: 37,
    stock: 20,
    image: IMG.rockSalt,
    description:
      "Natural pink Himalayan rock salt (Sendha Namak). Ideal for fasting and daily cooking.",
  },
  {
    id: "p14",
    name: "Kissan Tomato Ketchup",
    category: "grocery-staples",
    size: "500 g",
    mrp: 120,
    price: 110,
    stock: 16,
    image: IMG.ketchup,
    description:
      "Made from 100% real tomatoes. Tangy, thick and delicious.",
    isBestOffer: true,
  },
  {
    id: "p15",
    name: "Dabur Honey",
    category: "grocery-staples",
    size: "250 g",
    mrp: 145,
    price: 135,
    stock: 12,
    image: IMG.honey,
    description:
      "100% pure honey with no added sugar. Naturally golden goodness.",
    isFeatured: true,
    isPopular: true,
  },
];

export const getProductById = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

export const getProductsByCategory = (categoryId: string): Product[] =>
  PRODUCTS.filter((p) => p.category === categoryId);

export const searchProducts = (query: string): Product[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
};

export const BANNERS = [
  {
    id: "b0",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwxfHxncm9jZXJ5JTIwc3VwZXJtYXJrZXQlMjBiYW5uZXJ8ZW58MHx8fHwxNzg0NTQzNTYwfDA&ixlib=rb-4.1.0&q=85",
    title: "Fresh Groceries",
    subtitle: "Delivered in 30 mins",
    cta: "Shop Now",
  },
  {
    id: "b1",
    image:
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=85",
    title: "Dairy Essentials",
    subtitle: "Milk, curd, butter & more",
    cta: "Shop Dairy",
  },
  {
    id: "b2",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85",
    title: "Beauty & Personal Care",
    subtitle: "Everyday care for you & your family",
    cta: "Explore Now",
  },
  {
    id: "b3",
    image:
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=85",
    title: "Home Care Essentials",
    subtitle: "Cleaning & household needs",
    cta: "Shop Now",
  },
];
