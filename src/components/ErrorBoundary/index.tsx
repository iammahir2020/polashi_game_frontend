import React from 'react';
import { I18nContext } from '../../i18n/core';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  // Rendered instead of the default screen; gets a function that retries.
  fallback?: (retry: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Catches a render error anywhere below it and shows a way back, instead of
// unmounting the whole app to a blank page. React only supports this as a
// class component.
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // The language provider sits above this boundary, so the fallback can be translated.
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error('Render error caught by ErrorBoundary', error, info.componentStack);
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.retry);
    const { t } = this.context;

    return (
      <div role="alert" style={wrapStyle}>
        <h1 style={titleStyle}>{t('errorPage.title')}</h1>
        <p style={textStyle}>
          {t('errorPage.body')}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={primaryStyle} onClick={() => window.location.reload()}>
            {t('errorPage.reload')}
          </button>
          <button type="button" style={secondaryStyle} onClick={this.retry}>
            {t('errorPage.retry')}
          </button>
        </div>
      </div>
    );
  }
}

const wrapStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  padding: '24px',
  textAlign: 'center',
  backgroundColor: '#0f0f0f',
  color: '#e0e0e0',
  fontFamily: "'EB Garamond', serif",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Cinzel', serif",
  color: '#c5a059',
  fontSize: '26px',
};

const textStyle: React.CSSProperties = { margin: 0, maxWidth: '420px', fontSize: '18px', lineHeight: 1.5 };

const primaryStyle: React.CSSProperties = {
  padding: '12px 28px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#c5a059',
  color: '#000',
  fontWeight: 700,
  fontSize: '16px',
  cursor: 'pointer',
};

const secondaryStyle: React.CSSProperties = {
  ...primaryStyle,
  backgroundColor: 'transparent',
  color: '#c5a059',
  border: '1px solid #c5a059',
};
