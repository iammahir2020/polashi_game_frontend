/**
 * WideHeader — the tablet/desktop top bar.
 *
 * On phones, your name, the HQ code, "invite" and "leave" live in the
 * collapsible operative drawer. On wide screens this bar shows them all the
 * time. These tests check that it shows the right things in each state and
 * that each button calls the handler it was given, because the bar itself has
 * no logic, only wiring.
 *
 * `vi.fn()` makes a fake function that records every call, so a test can ask
 * "was the copy handler called, and with what?" without any real clipboard.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import WideHeader from './WideHeader';
import { makePlayer, makeRoom } from '../../../tests/factories';

const me = makePlayer({ name: 'Siraj' });

// Renders the header with sensible defaults; each test overrides what it needs.
function renderHeader(overrides: Partial<React.ComponentProps<typeof WideHeader>> = {}) {
  const props: React.ComponentProps<typeof WideHeader> = {
    newConnection: 'ok',
    isConnectedToSocket: true,
    room: makeRoom({ roomCode: 'AB12CD', players: [me] }),
    playerId: me.id,
    roomCode: 'AB12CD',
    handleCopy: vi.fn(),
    copiedStatus: null,
    leaveRoom: vi.fn(),
    ...overrides,
  };
  render(<WideHeader {...props} />);
  return props;
}

describe('WideHeader', () => {
  it('shows only the title and connection status before you join a room', () => {
    renderHeader({ room: null, playerId: null, roomCode: '' });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Polashi/i);
    // Room-only controls must not exist yet: there's nothing to invite to or leave.
    expect(screen.queryByRole('button', { name: /invite allies/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /abandon post/i })).toBeNull();
  });

  it('shows your name and the HQ code once you are in a room', () => {
    renderHeader();
    expect(screen.getByText('Siraj')).toBeInTheDocument();
    // The code is its own exact text node. The end-to-end tests find the room
    // code with an exact-match pattern, so it must never share a node with
    // other text.
    expect(screen.getByText('AB12CD')).toBeInTheDocument();
  });

  it('copies the code, copies the invite link and leaves through the given handlers', () => {
    const props = renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Copy HQ code' }));
    expect(props.handleCopy).toHaveBeenCalledWith('code');

    fireEvent.click(screen.getByRole('button', { name: 'INVITE ALLIES' }));
    expect(props.handleCopy).toHaveBeenCalledWith('link');

    fireEvent.click(screen.getByRole('button', { name: /abandon post/i }));
    expect(props.leaveRoom).toHaveBeenCalledTimes(1);
  });

  it('confirms a copied link on the button itself', () => {
    renderHeader({ copiedStatus: 'link' });
    expect(screen.getByRole('button', { name: 'LINK COPIED' })).toBeInTheDocument();
  });

  it('keeps the connection labels for screen readers when the tablet bar shows dots only', () => {
    renderHeader({ dense: true, isConnectedToSocket: false });
    // The words are visually hidden in dense mode but still in the document,
    // so assistive tech still hears "Internet ... Server ...".
    expect(screen.getByText('Internet')).toBeInTheDocument();
    expect(screen.getByText('Server')).toBeInTheDocument();
    // The dots are labelled images: one connected, one disconnected here.
    expect(screen.getByRole('img', { name: 'connected' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'disconnected' })).toBeInTheDocument();
  });
});
