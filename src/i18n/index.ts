import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';

export type TranslationResources = typeof en;

export const resources: Record<string, TranslationResources> = {
  en,
  es,
  fr,
  de,
  pt,
  tr,
};

class I18nManager {
  private currentLanguage: string = 'en';

  constructor() {
    // Try to auto-detect browser or system locale if available
    try {
      if (typeof navigator !== 'undefined' && navigator.language) {
        const lang = navigator.language.split('-')[0];
        if (resources[lang]) {
          this.currentLanguage = lang;
        }
      }
    } catch {}
  }

  get language(): string {
    return this.currentLanguage;
  }

  changeLanguage(lang: string): void {
    if (lang && resources[lang]) {
      this.currentLanguage = lang;
    } else if (lang) {
      this.currentLanguage = 'en';
    }
  }

  t(key: string, options?: Record<string, string | number>): string {
    const keys = key.split('.');
    
    // Attempt lookup in current language
    let res: any = resources[this.currentLanguage];
    for (const k of keys) {
      if (res && typeof res === 'object') {
        res = res[k];
      } else {
        res = undefined;
        break;
      }
    }

    // Fallback lookup in English if missing
    if (res === undefined && this.currentLanguage !== 'en') {
      res = resources['en'];
      for (const k of keys) {
        if (res && typeof res === 'object') {
          res = res[k];
        } else {
          res = undefined;
          break;
        }
      }
    }

    if (typeof res !== 'string') {
      return key;
    }

    if (options) {
      return res.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, placeholder: string) => {
        if (options[placeholder] !== undefined) {
          return String(options[placeholder]);
        }
        return `{{${placeholder}}}`;
      });
    }

    return res;
  }
}

export const i18n = new I18nManager();

export function useTranslation() {
  return {
    t: (key: string, options?: Record<string, string | number>) => i18n.t(key, options),
    i18n,
  };
}

export default i18n;
