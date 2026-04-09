export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

export const generateTrackingId = (): string => {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `TRK-${num}`;
};

export const hashPassword = (password: string): string => {
  return btoa(password);
};

export const verifyPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

export const now = (): string => new Date().toISOString();
