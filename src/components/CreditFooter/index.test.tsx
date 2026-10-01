import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreditFooter from '.';
import { PHYSICAL_GAME_URL } from './links';

describe('CreditFooter', () => {
  it('states that this is an unofficial adaptation, not endorsed by Playground Inc.', () => {
    render(<CreditFooter />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(
      'Unofficial fan-made digital adaptation of Polashi by Playground Inc.',
    );
    expect(footer).toHaveTextContent('Not affiliated with or endorsed by Playground Inc.');
  });

  it('links to the physical game in a new tab without leaking the opener', () => {
    render(<CreditFooter />);

    const link = screen.getByRole('link', { name: /get the physical game/i });
    expect(link).toHaveAttribute('href', PHYSICAL_GAME_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
