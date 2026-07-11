import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

// Load saved preference first, then fall back to browser detection
const savedLang = (() => {
  try {
    return localStorage.getItem('sw_language') || undefined;
  } catch {
    return undefined;
  }
})();

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
    },
    lng: savedLang,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'sw_language',
      caches: ['localStorage'],
    },
    returnObjects: false,
    returnNull: false,
  });

export default i18n;

/** Persist language choice to localStorage and switch */
export function setLanguage(lang: string) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  localStorage.setItem('sw_language', lang);
  void i18n.changeLanguage(lang);
}

/** List of supported language codes */
export function getSupportedLanguages(): string[] {
  return SUPPORTED_LANGUAGES;
}
