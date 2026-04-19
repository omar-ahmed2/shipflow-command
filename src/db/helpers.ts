export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

export const generateTrackingId = (prefix: string = 'Elmona', sequence: number = 1): string => {
  const d = new Date();
  const dateStr = `${d.getDate()}${d.getMonth() + 1}${d.getFullYear()}`;
  const seqStr = sequence.toString().padStart(2, '0');
  return `${prefix}-${dateStr}-${seqStr}`;
};

export const generateVerificationCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SH-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const hashPassword = (password: string): string => {
  return btoa(password);
};

export const verifyPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

export const now = (): string => new Date().toISOString();
