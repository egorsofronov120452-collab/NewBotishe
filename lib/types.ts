// Shared TypeScript types for VK Mini App

export interface StaffMember {
  uid: number;
  nick: string;
  bank: string;
  role: "kurier" | "ss" | "rs";
  groups: string[];
  vehicles: Vehicle[];
  orgVehicles: string[];
  stats: {
    deliveryOrders: number;
    taxiOrders: number;
  };
  createdAt: number;
}

export interface StaffFile {
  [uid: string]: StaffMember | Record<string, unknown>;
  profiles?: Record<string, unknown>;
}

export type UserRole = "rs" | "ss" | "kurier" | null;

export interface CatalogueCategory {
  id: string;
  name: string;
  photo?: string | null;
}

export interface CatalogueItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  temp?: string;
  categoryId: string;
  subItems: SubItem[];
  instruction?: string | null;
  photoId?: string | null;
}

export interface SubItem {
  name: string;
  qty: number;
  instruction?: string;
  type?: string;
}

export interface CatalogueSet {
  id: string;
  name: string;
  price: number;
  cost: number;
  subItems: SubItem[];
  photoId?: string | null;
}

export interface Catalogue {
  categories: CatalogueCategory[];
  items: CatalogueItem[];
  sets: CatalogueSet[];
}

export interface TaxiCategory {
  id: string;
  name: string;
}

export interface TaxiPoint {
  id: string;
  name: string;
  categoryId: string;
  defaultPrice: number;
  x?: number;
  y?: number;
}

export interface TaxiPoints {
  categories: TaxiCategory[];
  points: TaxiPoint[];
}

export interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_item";
  value: number;
  freeItem?: string;
  active: boolean;
  uses?: number;
  maxUses?: number;
  createdAt?: number;
}

export interface Promos {
  delivery: PromoCode[];
  taxi: PromoCode[];
}

export interface BasketItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  temp?: string;
}

export interface DeliveryOrder {
  id: string;
  type: "delivery";
  clientId: number;
  nick: string;
  address: string;
  basket: BasketItem[];
  total: number;
  finalPrice: number;
  promoDesc?: string;
  payment?: { type: string };
  status: "pending" | "accepted" | "cooking" | "delivering" | "done" | "cancelled";
  courierId?: number;
  courierNick?: string;
  eta?: string;
  createdAt: number;
}

export interface TaxiOrder {
  id: string;
  type: "taxi";
  clientId: number;
  nick: string;
  from: { id: string; name: string } | null;
  to: { id: string; name: string } | null;
  passengers: string[];
  payment: { type: string };
  finalPrice: number;
  status: "pending" | "accepted" | "on_the_way" | "done" | "cancelled";
  courierId?: number;
  courierNick?: string;
  eta?: string;
  createdAt: number;
}

export interface Orders {
  delivery: DeliveryOrder[];
  taxi: TaxiOrder[];
}

export interface Vehicle {
  type: string;
  name?: string;
  color?: string;
  photoId?: string;
}
