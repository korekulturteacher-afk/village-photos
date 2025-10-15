import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import trMessages from '@/messages/tr.json';
import arMessages from '@/messages/ar.json';
import koMessages from '@/messages/ko.json';

export type Locale = 'tr' | 'ar' | 'ko';

export const locales: Locale[] = ['tr', 'ar', 'ko'];
export const defaultLocale: Locale = 'tr';

export const localeNames: Record<Locale, string> = {
  tr: 'Türkçe',
  ar: 'العربية',
  ko: '한국어',
};

const messages: Record<Locale, typeof trMessages> = {
  tr: trMessages,
  ar: arMessages,
  ko: koMessages,
};

export function getMessages(locale: Locale) {
  return messages[locale] || messages[defaultLocale];
}

export function useTranslations(locale?: Locale) {
  const [currentLocale, setCurrentLocale] = useState<Locale>(locale || defaultLocale);

  useEffect(() => {
    // Load from localStorage
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && locales.includes(savedLocale)) {
      setCurrentLocale(savedLocale);
    }
  }, []);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = getMessages(currentLocale);

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (_, key) => String(params[key] || ''));
    }

    return typeof value === 'string' ? value : key;
  };

  const changeLocale = (newLocale: Locale) => {
    setCurrentLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    // Set document direction for RTL languages
    if (newLocale === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = newLocale;
    }
    // Reload page to apply changes immediately
    window.location.reload();
  };

  return { t, locale: currentLocale, changeLocale };
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && locales.includes(savedLocale)) {
      setLocale(savedLocale);
      // Set document direction
      if (savedLocale === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = savedLocale;
      }
    }
  }, []);

  return locale;
}
