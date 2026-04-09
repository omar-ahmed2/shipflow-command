import { ar } from './ar';
import { en } from './en';

export type Translations = typeof ar;
export type LangKey = keyof Translations;

export const translations = { ar, en } as const;
export type Lang = keyof typeof translations;

export const getTranslations = (lang: Lang): Translations => translations[lang];
