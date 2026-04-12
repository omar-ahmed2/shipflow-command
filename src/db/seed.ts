import { db } from './index';
import { hashPassword, now } from './helpers';
import type { User, Seller, Courier } from './schema';

export const seedDatabase = (): void => {
  if (db.isInitialized()) return;

  const admin: User = {
    id: "USR-ADMIN-001",
    name: "عمر",
    email: "omar@gmail.com",
    passwordHash: hashPassword("omar2004"),
    role: "admin",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  };

  db.create<User>('users', admin, 'USR');

  const seller: User = {
    id: "USR-SELLER-001",
    name: "متجر الأمل",
    email: "seller@gmail.com",
    passwordHash: hashPassword("seller123"),
    role: "seller",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  };

  db.create<User>('users', seller, 'USR');

  db.create<Seller>('sellers', {
    id: "SEL-001",
    userId: seller.id,
    storeName: "متجر الأمل للأزياء",
    phone: "01122334455",
    joinDate: now(),
    status: "active",
  }, 'SEL');

  // Also add a courier for testing
  const courier: User = {
    id: "USR-COURIER-001",
    name: "محمد أحمد",
    email: "mohamedahmed@gmail.com",
    passwordHash: hashPassword("mohamedahmed@2004"),
    role: "courier",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  };

  db.create<User>('users', courier, 'USR');

  db.create<Courier>('couriers', {
    id: "COU-001",
    userId: courier.id,
    name: courier.name,
    phone: "01099887766",
    zone: "القاهرة",
    vehicleType: "motorcycle",
    status: "active",
    joinDate: now(),
  }, 'COU');

  db.setInitialized();
};
