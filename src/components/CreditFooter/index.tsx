import React from 'react';
import { CONTACT_EMAIL, PHYSICAL_GAME_URL } from './links';
import { useI18n } from '../../i18n/useI18n';

interface CreditFooterProps {
  showHowToPlay?: boolean;
}

const CreditFooter: React.FC<CreditFooterProps> = ({ showHowToPlay = true }) => {
  const { t } = useI18n();
  return (
    <footer style={footerStyle}>
      <p style={{ margin: 0 }}>
        {t('footer.disclaimer')}{' '}
        <a href={PHYSICAL_GAME_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {t('footer.getGame')}
        </a>
      </p>
      <p style={{ margin: '6px 0 0' }}>
        {t('footer.copyright')} {t('footer.contact')}{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>
          {CONTACT_EMAIL}
        </a>
      </p>
      {showHowToPlay && (
        <p style={{ margin: '6px 0 0' }}>
          <a href="/how-to-play" style={linkStyle}>
            {t('footer.howTo')}
          </a>
        </p>
      )}
    </footer>
  );
};

const footerStyle: React.CSSProperties = {
  marginTop: '30px',
  padding: '12px 16px',
  textAlign: 'center',
  fontSize: '12px',
  lineHeight: 1.5,
  color: '#8a8a8a',
  borderTop: '1px solid rgba(197, 160, 89, 0.15)',
};

const linkStyle: React.CSSProperties = {
  color: '#c5a059',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

export default CreditFooter;
