import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import HowToPlay from '.';
import { MISSION_CONFIGS, TEAM_DISTRIBUTIONS } from '../../constants';

describe('HowToPlay', () => {
  it('covers the game, a walkthrough, the teams, a round, the endgame and the credits', () => {
    render(<HowToPlay />);

    for (const heading of [
      'What it is',
      'Step by step',
      'The two sides',
      'How a round works',
      'Winning, and the Mir Jafor endgame',
      'Credits',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
  });

  it('builds the team-size table from TEAM_DISTRIBUTIONS', () => {
    render(<HowToPlay />);

    const table = screen.getByRole('table', { name: /team sizes/i });
    const eicRow = within(table).getByRole('row', { name: /^EIC/ });
    const expected = Object.values(TEAM_DISTRIBUTIONS).map((d) => String(d.eic));
    expect(within(eicRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(expected);
  });

  it('builds the battalion table from MISSION_CONFIGS and marks two-sabotage rounds', () => {
    render(<HowToPlay />);

    const table = screen.getByRole('table', { name: /battalion size/i });
    const sevenRow = within(table).getByRole('row', { name: /^7\b/ });
    const expected = MISSION_CONFIGS[7].map((m) => `${m.players}${m.failsRequired > 1 ? '*' : ''}`);
    expect(within(sevenRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(expected);
  });

  it('credits Playground Inc. and does not repeat the how-to-play link on itself', () => {
    render(<HowToPlay />);

    expect(screen.getByRole('contentinfo')).toHaveTextContent('Not affiliated with or endorsed by Playground Inc.');
    expect(screen.queryByRole('link', { name: /how to play/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play now' })).toHaveAttribute('href', '/');
  });

  it('says what is stored and that nothing needs a real name', () => {
    render(<HowToPlay />);
    const privacy = screen.getByRole('heading', { level: 2, name: 'Privacy' }).closest('section')!;
    expect(privacy).toHaveTextContent('no accounts');
    expect(privacy).toHaveTextContent('sets no cookies');
    expect(privacy).toHaveTextContent('saves a record for statistics');
  });
});
