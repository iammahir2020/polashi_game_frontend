import React, { useEffect, useRef, useState } from 'react';
import { SHOT_SIZE, shotUrl, walkthroughFor, type WalkthroughStep } from './walkthroughSteps';
import { useI18n } from '../../i18n/useI18n';
import { withEmphasis } from '../../i18n/core';

// Phone screenshots up to this width, desktop ones above it.
const PHONE_QUERY = '(max-width: 640px)';
const SWIPE_PX = 40;

/**
 * The illustrated walkthrough on the How to play page.
 *
 * In the browser it is a slideshow: Previous/Next, step dots, arrow keys and
 * swipes. The pre-rendered HTML (no window, so `interactive` is false) lists
 * every step instead, so crawlers and readers without JavaScript get all of it.
 */
const Walkthrough: React.FC<{ interactive?: boolean }> = ({
  interactive = typeof window !== 'undefined',
}) => {
  const { lang } = useI18n();
  const steps = walkthroughFor(lang);
  if (!interactive) {
    return (
      <ol style={listStyle}>
        {steps.map((step, index) => (
          <li key={step.id} style={{ marginBottom: '28px' }}>
            <Shot step={step} lazy={index > 0} />
            <Caption step={step} index={index} />
          </li>
        ))}
      </ol>
    );
  }
  return <Slideshow />;
};

const Slideshow: React.FC = () => {
  const { t, num, lang } = useI18n();
  const steps = walkthroughFor(lang);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const step = steps[index];
  const last = steps.length - 1;
  const go = (next: number) => setIndex(Math.max(0, Math.min(last, next)));

  // Fetch the neighbouring screenshots in the background so the next click is instant.
  useEffect(() => {
    const size = window.matchMedia?.(PHONE_QUERY).matches ? 'phone' : 'desktop';
    for (const neighbour of [steps[index + 1], steps[index - 1]]) {
      if (neighbour) new Image().src = shotUrl(neighbour.id, size, lang);
    }
  }, [index, steps, lang]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t('walk.aria')}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx <= -SWIPE_PX) go(index + 1);
        else if (dx >= SWIPE_PX) go(index - 1);
      }}
      style={slideshowStyle}
    >
      <div role="group" aria-roledescription="slide" aria-label={t('walk.slideOf', { index: index + 1, total: steps.length })}>
        <Shot step={step} lazy={false} />
      </div>

      <div style={controlsStyle}>
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} style={navButtonStyle(index === 0)}>
          {t('walk.previous')}
        </button>
        <span style={counterStyle}>{num(index + 1)} / {num(steps.length)}</span>
        <button type="button" onClick={() => go(index + 1)} disabled={index === last} style={navButtonStyle(index === last)}>
          {t('walk.next')}
        </button>
      </div>

      <div style={dotsStyle}>
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={t('walk.dotLabel', { index: i + 1, title: s.title })}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => go(i)}
            style={dotButtonStyle}
          >
            <span style={dotStyle(i === index)} />
          </button>
        ))}
      </div>

      <div aria-live="polite">
        <Caption step={step} index={index} />
      </div>
    </div>
  );
};

// A screenshot: the phone one on narrow screens, the desktop one otherwise.
const Shot: React.FC<{ step: WalkthroughStep; lazy: boolean }> = ({ step, lazy }) => {
  const { lang } = useI18n();
  return (
  <picture>
    <source
      media={PHONE_QUERY}
      srcSet={shotUrl(step.id, 'phone', lang)}
      width={SHOT_SIZE.phone.width}
      height={SHOT_SIZE.phone.height}
    />
    <img
      src={shotUrl(step.id, 'desktop', lang)}
      width={SHOT_SIZE.desktop.width}
      height={SHOT_SIZE.desktop.height}
      alt={step.alt}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      style={imageStyle}
    />
  </picture>
  );
};

const Caption: React.FC<{ step: WalkthroughStep; index: number }> = ({ step, index }) => {
  const { t } = useI18n();
  return (
  <div style={captionStyle}>
    <h3 style={stepTitleStyle}>
      <span style={stepNumberStyle}>{t('walk.stepNumber', { index: index + 1 })}</span> {step.title}
    </h3>
    <p style={whoStyle}>{step.who}</p>
    <p style={{ margin: 0 }}>{withEmphasis(step.text, { color: '#e7d6ad' })}</p>
  </div>
  );
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '16px 0 0',
};

const slideshowStyle: React.CSSProperties = {
  margin: '16px 0 0',
  outline: 'none',
};

const imageStyle: React.CSSProperties = {
  display: 'block',
  width: 'auto',
  height: 'auto',
  maxWidth: '100%',
  maxHeight: '70vh',
  margin: '0 auto',
  borderRadius: '10px',
  border: '1px solid #333',
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  margin: '14px 0 8px',
};

const navButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 18px',
  minWidth: '112px',
  background: 'transparent',
  border: `1px solid ${disabled ? '#333' : '#c5a059'}`,
  borderRadius: '6px',
  color: disabled ? '#555' : '#c5a059',
  fontFamily: "'Cinzel', serif",
  fontSize: '14px',
  letterSpacing: '1px',
  cursor: disabled ? 'default' : 'pointer',
});

const counterStyle: React.CSSProperties = {
  color: '#bbb',
  fontSize: '15px',
  fontVariantNumeric: 'tabular-nums',
};

const dotsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '2px',
  marginBottom: '14px',
};

// A 24px tap target around a 12px dot.
const dotButtonStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  padding: '6px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
};

const dotStyle = (current: boolean): React.CSSProperties => ({
  display: 'block',
  width: '12px',
  height: '12px',
  boxSizing: 'border-box',
  borderRadius: '50%',
  border: '1px solid #c5a059',
  background: current ? '#c5a059' : 'transparent',
});

const captionStyle: React.CSSProperties = {
  marginTop: '12px',
};

const stepTitleStyle: React.CSSProperties = {
  margin: '0 0 2px',
  fontFamily: "'Cinzel', serif",
  fontSize: '18px',
  color: '#e7d6ad',
};

const stepNumberStyle: React.CSSProperties = {
  color: '#c5a059',
};

const whoStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '14px',
  color: '#999',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

export default Walkthrough;
