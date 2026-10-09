/**
 * Walkthrough — the illustrated step-by-step section of the How to play page.
 *
 * It has two faces, and both are tested here:
 *  - In the browser it is a slideshow (Previous/Next, dots, arrow keys, swipe).
 *  - In the pre-rendered HTML there is no `window`, so it lists every step,
 *    which is what crawlers and readers without JavaScript get. The tests pass
 *    `interactive={false}` to get that face, the same way the prerender does by
 *    having no `window`.
 *
 * The last block checks the data against the files on disk: every step needs
 * a phone and a desktop screenshot, made by `npm run walkthrough:shots`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Walkthrough from './Walkthrough';
import { WALKTHROUGH, WALKTHROUGH_BN, shotUrl } from './walkthroughSteps';
import LanguageProvider from '../../i18n/LanguageProvider';

const TOTAL = WALKTHROUGH.length;

// The step title is an <h3> whose text starts with "Step N."
const currentTitle = () => screen.getByRole('heading', { level: 3 });

describe('Walkthrough slideshow', () => {
  it('starts on step 1 with Previous disabled', () => {
    render(<Walkthrough interactive />);

    expect(screen.getByText(`1 / ${TOTAL}`)).toBeInTheDocument();
    expect(currentTitle()).toHaveTextContent(`Step 1. ${WALKTHROUGH[0].title}`);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled();
  });

  it('shows one screenshot, with the phone version offered for narrow screens', () => {
    const { container } = render(<Walkthrough interactive />);
    const first = WALKTHROUGH[0];

    // getByRole('img') finds the <img>; its <source> sibling isn't an image role,
    // so it's checked through the DOM directly.
    const img = screen.getByRole('img', { name: first.alt });
    expect(img).toHaveAttribute('src', shotUrl(first.id, 'desktop'));
    const source = container.querySelector('source');
    expect(source).toHaveAttribute('srcset', shotUrl(first.id, 'phone'));
    expect(source).toHaveAttribute('media', '(max-width: 640px)');
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('moves with Next and Previous, and stops at both ends', async () => {
    const user = userEvent.setup();
    render(<Walkthrough interactive />);
    const next = screen.getByRole('button', { name: /Next/ });
    const previous = screen.getByRole('button', { name: /Previous/ });

    await user.click(next);
    expect(screen.getByText(`2 / ${TOTAL}`)).toBeInTheDocument();
    expect(currentTitle()).toHaveTextContent(WALKTHROUGH[1].title);

    await user.click(previous);
    expect(screen.getByText(`1 / ${TOTAL}`)).toBeInTheDocument();

    for (let i = 1; i < TOTAL; i++) await user.click(next);
    expect(screen.getByText(`${TOTAL} / ${TOTAL}`)).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it('jumps to any step from its dot, and marks the current one', async () => {
    const user = userEvent.setup();
    render(<Walkthrough interactive />);
    const target = WALKTHROUGH[9];

    await user.click(screen.getByRole('button', { name: `Step 10: ${target.title}` }));

    expect(currentTitle()).toHaveTextContent(`Step 10. ${target.title}`);
    expect(screen.getByRole('button', { name: `Step 10: ${target.title}` })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: `Step 1: ${WALKTHROUGH[0].title}` })).not.toHaveAttribute('aria-current');
  });

  it('follows the arrow keys once the slideshow has focus', async () => {
    const user = userEvent.setup();
    render(<Walkthrough interactive />);

    // The region is focusable (tabIndex 0), so keyboard users can tab to it.
    screen.getByRole('region', { name: 'Walkthrough' }).focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByText(`3 / ${TOTAL}`)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(`2 / ${TOTAL}`)).toBeInTheDocument();
  });

  it('follows a swipe, but not a short drag', () => {
    render(<Walkthrough interactive />);
    const region = screen.getByRole('region', { name: 'Walkthrough' });
    // user-event has no touch gestures, so the touch events are fired directly.
    const swipe = (from: number, to: number) => {
      fireEvent.touchStart(region, { touches: [{ clientX: from }] });
      fireEvent.touchEnd(region, { changedTouches: [{ clientX: to }] });
    };

    swipe(300, 100); // right to left: next
    expect(screen.getByText(`2 / ${TOTAL}`)).toBeInTheDocument();
    swipe(100, 120); // 20px: too short to count
    expect(screen.getByText(`2 / ${TOTAL}`)).toBeInTheDocument();
    swipe(100, 300); // left to right: previous
    expect(screen.getByText(`1 / ${TOTAL}`)).toBeInTheDocument();
  });

  it('shows button names marked **like this** in bold', () => {
    render(<Walkthrough interactive />);
    // Step 1 says to press **Establish New HQ**.
    const bold = within(currentTitle().parentElement!).getByText('Establish New HQ');
    expect(bold.tagName).toBe('STRONG');
  });
});

describe('Walkthrough without JavaScript (the pre-rendered page)', () => {
  it('lists every step with its screenshot and caption, and no slideshow controls', () => {
    render(<Walkthrough interactive={false} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(TOTAL);
    expect(screen.getAllByRole('img')).toHaveLength(TOTAL);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(
      WALKTHROUGH.map((step, i) => `Step ${i + 1}. ${step.title}`),
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('loads the first screenshot straight away and the rest lazily', () => {
    render(<Walkthrough interactive={false} />);
    const [first, ...rest] = screen.getAllByRole('img');
    expect(first).not.toHaveAttribute('loading');
    expect(rest.every((img) => img.getAttribute('loading') === 'lazy')).toBe(true);
  });
});

describe('walkthrough data', () => {
  it('has unique ids, and every step has both screenshots on disk', () => {
    const ids = WALKTHROUGH.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    const publicDir = path.join(process.cwd(), 'public');
    const missing = ids.flatMap((id) =>
      (['phone', 'desktop'] as const)
        .map((size) => shotUrl(id, size))
        .filter((url) => !fs.existsSync(path.join(publicDir, url))),
    );
    // If this fails, run `npm run walkthrough:shots` (see scripts/walkthrough-shots.mjs).
    expect(missing).toEqual([]);
  });

  it('closes every **bold** marker it opens', () => {
    for (const step of [...WALKTHROUGH, ...WALKTHROUGH_BN]) {
      expect(step.text.split('**').length % 2, step.id).toBe(1);
    }
  });

  it('has the same steps in Bangla, each with its own Bangla screenshots on disk', () => {
    expect(WALKTHROUGH_BN.map((s) => s.id)).toEqual(WALKTHROUGH.map((s) => s.id));

    const publicDir = path.join(process.cwd(), 'public');
    const missing = WALKTHROUGH_BN.flatMap(({ id }) =>
      (['phone', 'desktop'] as const)
        .map((size) => shotUrl(id, size, 'bn'))
        .filter((url) => !fs.existsSync(path.join(publicDir, url))),
    );
    // If this fails, run `npm run walkthrough:shots -- bn`.
    expect(missing).toEqual([]);
  });
});

describe('the walkthrough in Bangla', () => {
  it('shows the Bangla steps, labels and screenshots', () => {
    render(
      <LanguageProvider initialLang="bn">
        <Walkthrough interactive />
      </LanguageProvider>,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(`ধাপ ১। ${WALKTHROUGH_BN[0].title}`);
    expect(screen.getByRole('button', { name: /পরের/ })).toBeEnabled();
    expect(screen.getByRole('img')).toHaveAttribute('src', shotUrl(WALKTHROUGH_BN[0].id, 'desktop', 'bn'));
  });
});
