import { createContext, createElement, type CSSProperties, type ReactNode } from 'react';
import type { CharacterType } from '../types/game';
import { en, type TKey } from './en';
import { bn } from './bn';
import { characterDescription, characterName, intelLine, teamName, winnerName } from './characters';

export type Lang = 'en' | 'bn';
export type { TKey };

// A key to translate later. Values can themselves be keys, for a name that
// has to be translated too (the "Someone" in "Someone is spying on you").
export type MessageRef = { key: TKey; vars?: Vars };
export type Vars = Record<string, string | number | MessageRef>;

// Text kept in state (dialogs, toasts, errors) is stored as one of these and
// translated when it is shown, so switching language also switches what is
// already on screen. `raw` is text with no translation: what an older server
// sent without a code.
export type Message = MessageRef | { raw: string };

const DICTIONARIES: Record<Lang, Record<TKey, string>> = { en, bn };

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// 12 -> "১২" in Bangla. Only for numbers the game shows, never for room codes.
export function localizeDigits(value: number | string, lang: Lang): string {
  const text = String(value);
  return lang === 'bn' ? text.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]) : text;
}

export function translate(lang: Lang, key: TKey, vars?: Vars): string {
  const template = DICTIONARIES[lang][key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) return match;
    if (typeof value === 'number') return localizeDigits(value, lang);
    if (typeof value === 'string') return value;
    return translate(lang, value.key, value.vars);
  });
}

export function translateMessage(lang: Lang, message: Message): string {
  return 'raw' in message ? message.raw : translate(lang, message.key, message.vars);
}

// Turns `**text**` into <strong>text</strong> and `*text*` into <em>text</em>.
export function withEmphasis(text: string, strongStyle?: CSSProperties): ReactNode[] {
  return text.split(/(\*\*.+?\*\*|\*[^*\s][^*]*\*)/).map((part, i) => {
    if (i % 2 === 0) return part;
    return part.startsWith('**')
      ? createElement('strong', { key: i, style: strongStyle }, part.slice(2, -2))
      : createElement('em', { key: i }, part.slice(1, -1));
  });
}

export function isKey(key: string): key is TKey {
  return Object.prototype.hasOwnProperty.call(en, key);
}

// What the server sent, as something to show: its code's translation when we
// know the code and have every value it needs, otherwise the English text it
// sent (older servers send no code).
export function serverMessage(
  kind: 'server' | 'notify',
  code: string | undefined,
  params: Record<string, string> | undefined,
  fallbackText: string,
): Message {
  const key = `${kind}.${code}`;
  if (!code || !isKey(key)) return { raw: fallbackText };
  const needed = [...en[key].matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  if (needed.some((name) => params?.[name] === undefined)) return { raw: fallbackText };
  return params ? { key, vars: params } : { key };
}

// Whether a stored message is one of these server errors: by its code, or, for
// an older server that sends no code, by a fragment of its English text.
export function isServerError(message: Message, codes: string | string[], englishFragment: string): boolean {
  if ('raw' in message) return message.raw.toLowerCase().includes(englishFragment);
  return ([] as string[]).concat(codes).some((code) => message.key === `server.${code}`);
}

// The chosen language is kept on this device. Without a choice, a browser set
// to Bangla starts in Bangla and every other one in English.
const STORAGE_KEY = 'lang';

export function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'bn') return stored;
  } catch {
    // Storage blocked: fall through to the browser's language.
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('bn')) return 'bn';
  return 'en';
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not fatal: the choice just isn't remembered after a reload.
  }
}

export type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Plain text for a key. */
  t: (key: TKey, vars?: Vars) => string;
  /** Text for a key with its `**bold**` parts in <strong> and `*italic*` parts in <em>. */
  rich: (key: TKey, vars?: Vars, strongStyle?: CSSProperties) => ReactNode[];
  /** A stored Message, in the current language. */
  msg: (message: Message) => string;
  /** A number in the current language's digits. */
  num: (value: number | string) => string;
  characterName: (character: CharacterType | null | undefined) => string;
  characterDescription: (character: CharacterType | null | undefined) => string;
  team: (team: string | undefined | null) => string;
  winner: (winner: string | undefined | null) => string;
  intel: (line: string) => string;
};

export function makeI18n(lang: Lang, setLang: (lang: Lang) => void): I18n {
  return {
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    rich: (key, vars, strongStyle) => withEmphasis(translate(lang, key, vars), strongStyle),
    msg: (message) => translateMessage(lang, message),
    num: (value) => localizeDigits(value, lang),
    characterName: (character) => characterName(character, lang),
    characterDescription: (character) => characterDescription(character, lang),
    team: (team) => teamName(team, lang),
    winner: (winner) => winnerName(winner, lang),
    intel: (line) => intelLine(line, lang),
  };
}

// Without a provider (unit tests that render one component) everything is
// English and switching does nothing.
export const I18nContext = createContext<I18n>(makeI18n('en', () => {}));
