/**
 * The toggle, end to end through React: click it, and everything under the
 * provider re-renders in the other language, <html lang> follows (it drives
 * the Bangla typography rules in index.css), and the choice is saved.
 *
 * Components are rendered inside <LanguageProvider>, as main.tsx does. Every
 * OTHER test file renders components without it, and gets English: that's the
 * context's default, and the reason none of the older tests had to change.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageProvider from './LanguageProvider';
import LanguageToggle from './LanguageToggle';
import GameHeader from '../components/GameHeader';
import RoomLockedAlert from '../components/RoomLockedAlert';
import IntelPopup from '../components/IntepPopup';

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});

describe('LanguageToggle', () => {
  it('switches the page to Bangla and back, and remembers the choice', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider initialLang="en">
        <GameHeader newConnection="ok" isConnectedToSocket />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { name: /the battle of/i })).toBeInTheDocument();
    // The label names the language you switch TO, written in that language.
    await user.click(screen.getByRole('button', { name: /switch to bangla/i }));

    expect(screen.getByRole('heading', { name: 'পলাশীর যুদ্ধ' })).toBeInTheDocument();
    expect(screen.getByText(/ইন্টারনেট/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('bn');
    expect(localStorage.getItem('lang')).toBe('bn');

    await user.click(screen.getByRole('button', { name: /switch to english/i }));
    expect(screen.getByRole('heading', { name: /the battle of/i })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('re-translates a message already on screen', async () => {
    // Messages are stored as keys and translated at render, so an alert that
    // is already showing follows the switch instead of staying in English.
    const user = userEvent.setup();
    render(
      <LanguageProvider initialLang="en">
        <LanguageToggle />
        <RoomLockedAlert error={{ key: 'server.ROOM_LOCKED' }} wasKicked={false} cardStyle={{}} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/Fortress Fortified/)).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(screen.getByText(/দুর্গ সুরক্ষিত/)).toBeInTheDocument();
  });
});

describe('components that act on which message arrived', () => {
  it('shows the locked alert for an older server’s English text too', () => {
    render(<RoomLockedAlert error={{ raw: 'Room is locked' }} wasKicked={false} cardStyle={{}} />);
    expect(screen.getByText(/Fortress Fortified/)).toBeInTheDocument();
  });

  it('does not show the locked alert for other errors', () => {
    const { container } = render(<RoomLockedAlert error={{ key: 'server.ROOM_FULL' }} wasKicked={false} cardStyle={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a Guptochor report in Bangla, side included', () => {
    render(
      <LanguageProvider initialLang="bn">
        <IntelPopup
          intelPopup={{
            type: 'private',
            message: { key: 'intel.report', vars: { name: 'Asha', side: { key: 'intel.traitor' } } },
          }}
          onClose={() => {}}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText(/লক্ষ্য: Asha/)).toHaveTextContent('কোম্পানির চর');
    expect(screen.getByText('গোপনীয়')).toBeInTheDocument();
  });
});
