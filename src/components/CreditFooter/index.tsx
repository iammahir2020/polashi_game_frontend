import React from 'react';
import { PHYSICAL_GAME_URL } from './links';

const CreditFooter: React.FC = () => {
  return (
    <footer style={footerStyle}>
      <p style={{ margin: 0 }}>
        Unofficial fan-made digital adaptation of Polashi by Playground Inc. Not affiliated with or
        endorsed by Playground Inc.{' '}
        <a href={PHYSICAL_GAME_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          Get the physical game →
        </a>
      </p>
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
