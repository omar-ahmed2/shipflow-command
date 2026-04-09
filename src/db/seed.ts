import { db } from './index';
import { hashPassword, now } from './helpers';
import type { User } from './schema';

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
  db.setInitialized();
};
