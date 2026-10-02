/**
 * ErrorBoundary — the last line of defence against a blank page.
 *
 * React unmounts the whole tree when a component throws during render. In a
 * multiplayer game that means one bad update blanks every player's screen.
 * The boundary catches it and offers "Reload" (the seat is kept in storage, so
 * a reload rejoins) and "Try again" (re-renders in place, for one-off errors).
 *
 * React logs caught render errors to console.error even when a boundary
 * handles them; that's expected noise, so it's silenced per test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from './index';

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <p>Board is back</p>;
}

describe('ErrorBoundary', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    shouldThrow = true;
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders its children when nothing goes wrong', () => {
    shouldThrow = false;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Board is back')).toBeInTheDocument();
  });

  it('shows a recovery screen instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('"Try again" re-renders the children once the cause is gone', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Board is back')).toBeInTheDocument();
  });

  it('"Reload" reloads the page', () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledOnce();
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('uses a custom fallback when given one', () => {
    render(
      <ErrorBoundary fallback={(retry) => <button onClick={retry}>Custom</button>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
  });
});
