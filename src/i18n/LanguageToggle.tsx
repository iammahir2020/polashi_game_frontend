import React from 'react';
import { useI18n } from './useI18n';

// Switches between English and Bangla. The label is the language you switch
// TO, written in that language, so someone who can't read the current one can
// still find it.
const LanguageToggle: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { lang, setLang, t } = useI18n();
  const next = lang === 'en' ? 'bn' : 'en';

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={t('lang.switchAria')}
      title={t('lang.switchAria')}
      lang={next}
      style={{ ...toggleStyle, ...style }}
    >
      <span aria-hidden="true">🌐</span> {t('lang.switchLabel')}
    </button>
  );
};

const toggleStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 12px',
  borderRadius: '999px',
  border: '1px solid rgba(197, 160, 89, 0.55)',
  backgroundColor: 'rgba(197, 160, 89, 0.08)',
  color: '#e7d6ad',
  fontSize: '13px',
  lineHeight: 1.2,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default LanguageToggle;
