import { translations } from '../constants/translations';

/**
 * Translates a given response message key or text based on the client language preference.
 * Defaults to 'en' (English) if the translation or language code is not found.
 */
export const translateMessage = (message: string, lang: string = 'en'): string => {
  if (!message) return message;

  // Normalise language code (e.g., 'en-US' -> 'en', 'es-419' -> 'es')
  const baseLang = lang.split('-')[0].split(',')[0].trim().toLowerCase();

  const langDictionary = translations[baseLang] || translations['en'];
  return langDictionary[message] || message;
};
