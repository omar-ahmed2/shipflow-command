export type ShipmentStatus =
  | "pending"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "courier" | "seller";
  phone?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Courier {
  id: string;
  userId: string;
  name: string;
  phone: string;
  zone: string;
  vehicleType: "motorcycle" | "car" | "van";
  status: "active" | "offline" | "on_delivery";
  joinDate: string;
  notes?: string;
}

export interface Seller {
  id: string;
  userId: string;
  storeName: string;
  phone: string;
  address?: string;
  joinDate: string;
  status: "active" | "inactive";
  shippingFee: number; // default shipping fee agreed with this seller
}

export interface Shipment {
  id: string;
  trackingId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  governorate: string;
  price: number;
  paymentType: "COD" | "paid";
  codCollected: boolean;
  courierCollected?: boolean;
  shippingFee?: number; // fee deducted from seller
  sellerSettled?: boolean; // true if the admin has paid the seller
  status: ShipmentStatus;
  courierId: string | null;
  sellerId: string | null;
  createdBy: string;
  verificationCode: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  note?: string;
  actor: string;
  actorRole: "admin" | "courier" | "seller";
  timestamp: string;
}

export interface Notification {
  id: string;
  targetRole: "admin" | "courier" | "seller";
  targetUserId?: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  courierId?: string;
  sellerId?: string;
  amount: number;
  shipmentCount: number;
  date: string;
  adminName: string;
}
