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
  role: "admin" | "courier";
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
  status: ShipmentStatus;
  courierId: string | null;
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
  actorRole: "admin" | "courier";
  timestamp: string;
}

export interface Notification {
  id: string;
  targetRole: "admin" | "courier";
  targetUserId?: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}
