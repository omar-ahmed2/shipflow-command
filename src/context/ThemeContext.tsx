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
  const [isDark, setIsDark] = useState(() => localStorage.getItem('shipflow_theme') === 'dark');
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('shipflow_lang') as Lang) || 'ar');

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('shipflow_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = t.lang;
    localStorage.setItem('shipflow_lang', lang);
  }, [lang, t]);

  const toggleTheme = () => setIsDark(p => !p);
  const setLang = (l: Lang) => setLangState(l);

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
