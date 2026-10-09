import { useContext } from 'react';
import { I18nContext, type I18n } from './core';

/** The current language and the functions that translate into it. */
export function useI18n(): I18n {
  return useContext(I18nContext);
}
