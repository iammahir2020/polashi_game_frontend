import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext, loadLang, makeI18n, saveLang, type Lang } from './core';

// Holds the chosen language for the whole app. Mounted once, above everything
// (main.tsx), so the error screen is translated too.
const LanguageProvider: React.FC<{ children: React.ReactNode; initialLang?: Lang }> = ({ children, initialLang }) => {
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? loadLang());

  // <html lang> drives the Bangla typography rules in index.css, and tells
  // screen readers which voice to read the page in.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    saveLang(next);
    setLangState(next);
  }, []);

  const value = useMemo(() => makeI18n(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default LanguageProvider;
