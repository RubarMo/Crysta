import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, LocaleKeys } from './locales';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: LocaleKeys, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem('crysta_lang') === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('crysta_lang', lang);
    } catch {
      // Language just isn't remembered.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: LocaleKeys, replacements?: Record<string, string>): string => {
    let text: string = translations[language]?.[key] || translations.en?.[key] || String(key);
    if (replacements) {
      for (const [placeholder, value] of Object.entries(replacements)) {
        text = text.split(`{${placeholder}}`).join(value);
      }
    }
    return text;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
