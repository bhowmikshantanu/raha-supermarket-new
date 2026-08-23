import type { Category } from "@/src/types";

export const CATEGORIES: Category[] = [
  {
    id: "grocery-staples",
    name: "Grocery & Staples",
    image:
      "https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    color: "#FEF3C7",
    icon: "basket",
  },
  {
    id: "dairy",
    name: "Dairy Products",
    image:
      "https://images.unsplash.com/photo-1634141510639-d691d86f47be?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxNzV8MHwxfHNlYXJjaHwxfHxtaWxrJTIwZGFpcnl8ZW58MHx8fHwxNzg0NTQzNTYwfDA&ixlib=rb-4.1.0&q=85",
    color: "#DBEAFE",
    icon: "water",
  },
  {
    id: "snacks-biscuits",
    name: "Snacks & Biscuits",
    image:
      "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxzbmFja3MlMjBjaGlwc3xlbnwwfHx8fDE3ODQ1NDM1NjB8MA&ixlib=rb-4.1.0&q=85",
    color: "#FCE7F3",
    icon: "fast-food",
  },
  {
    id: "beverages",
    name: "Beverages",
    image:
      "https://images.unsplash.com/photo-1648569883125-d01072540b4c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwxfHxjb2xhJTIwYm90dGxlfGVufDB8fHx8MTc4NDU0MzU2MHww&ixlib=rb-4.1.0&q=85",
    color: "#FEE2E2",
    icon: "cafe",
  },
  {
    id: "household",
    name: "Household Essentials",
    image:
      "https://images.pexels.com/photos/5217889/pexels-photo-5217889.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    color: "#E0E7FF",
    icon: "home",
  },
  {
    id: "personal-care",
    name: "Personal Care",
    image:
      "https://images.pexels.com/photos/10574055/pexels-photo-10574055.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    color: "#DCFCE7",
    icon: "sparkles",
  },
];

export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);
