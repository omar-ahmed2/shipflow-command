import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Lang, type Translations } from '@/i18n';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark] = useState(true);
  const [lang] = useState<Lang>('ar');

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.dir = t.dir;
    document.documentElement.lang = t.lang;
  }, [t]);

  const toggleTheme = () => {};
  const setLang = () => {};

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, lang, setLang, t }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
