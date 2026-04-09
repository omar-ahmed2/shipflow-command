export const formatDate = (date: string, lang: string = 'ar'): string => {
  return new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

export const formatDateTime = (date: string, lang: string = 'ar'): string => {
  return new Date(date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('ar-EG');
};

export const isToday = (date: string): boolean => {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

export const isThisWeek = (date: string): boolean => {
  const d = new Date(date);
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo && d <= today;
};
