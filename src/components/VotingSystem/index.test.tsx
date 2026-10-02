/**
 * VotingSystem — the same vote, presented two ways.
 *
 * On phones the vote is a full-screen overlay: a modal dialog that traps
 * keyboard focus (Tab cycles inside it) and closes on Escape. On tablets and
 * desktops (`inline`) it's a panel inside the war room, so the roster and
 * your role card stay usable next to it.
 *
 * What must NOT change between the two is the vote itself. These tests check
 * both halves: the presentation differs, and the votes cast are identical.
 *
 * Roles are what assistive technology announces, so they're what we query:
 * `dialog` for the overlay, `region` (a landmark named "Voting session") for
 * the inline panel.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import VotingSystem from './index';
import { makePlayer, makeRoom, makeVotingState } from '../../../tests/factories';

const me = makePlayer({ name: 'Siraj' });
const other = makePlayer({ name: 'Clive' });

// An open council vote on a two-person battalion that nobody has voted on yet.
const room = makeRoom({
  players: [me, other],
  activePlayerIds: [me.id, other.id],
  gameStarted: true,
  proposedTeam: [me.id, other.id],
  voting: makeVotingState({ active: true, type: 'teamApproval', votes: {} }),
});

function renderVote(inline: boolean) {
  const handlers = {
    handleYesVote: vi.fn(),
    handleNoVote: vi.fn(),
    handleClearVote: vi.fn(),
    handleStartVote: vi.fn(),
    handleStartSecretVote: vi.fn(),
  };
  render(
    <VotingSystem room={room} playerId={me.id} isGameMaster={false} primaryBtn={{}} inline={inline} {...handlers} />,
  );
  return handlers;
}

describe('VotingSystem', () => {
  it('is a modal dialog on phones', () => {
    renderVote(false);
    const dialog = screen.getByRole('dialog', { name: 'Voting session' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.queryByRole('region', { name: 'Voting session' })).toBeNull();
  });

  it('is a named region, not a modal, in the war room', () => {
    renderVote(true);
    // No dialog: nothing on the page is blocked while the vote runs.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Voting session' })).toBeInTheDocument();
  });

  it('does not take keyboard focus away from the page when inline', () => {
    // The overlay version moves focus into itself on open (the focus trap);
    // the inline panel must leave focus wherever the player had it.
    renderVote(true);
    expect(document.activeElement).toBe(document.body);
  });

  it('ignores Escape when inline: only the overlay closes on it', () => {
    // As host, Escape on the overlay cancels the vote. Inline there is no
    // overlay to dismiss, so Escape must do nothing at all.
    const handlers = { handleClearVote: vi.fn() };
    render(
      <VotingSystem
        room={room} playerId={me.id} isGameMaster primaryBtn={{}} inline
        handleYesVote={vi.fn()} handleNoVote={vi.fn()} handleStartVote={vi.fn()}
        handleStartSecretVote={vi.fn()} {...handlers}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handlers.handleClearVote).not.toHaveBeenCalled();
  });

  it.each([false, true])('casts the same vote either way (inline: %s)', (inline) => {
    const handlers = renderVote(inline);
    // The two seals' order is randomised per vote (so nobody can read a choice
    // from where a hand moved), which is why we find them by name, not position.
    fireEvent.click(screen.getByRole('button', { name: 'APPROVE' }));
    expect(handlers.handleYesVote).toHaveBeenCalledTimes(1);
    expect(handlers.handleNoVote).not.toHaveBeenCalled();
  });
});

/**
 * Observers don't sit on the council.
 *
 * The council vote is cast by the battalion (`activePlayerIds`), which is
 * also how the server counts it. The screen used to count every player in
 * the room instead, so with an observer present it showed "0 / 6" and listed
 * the observer under "Awaiting votes from" for the whole vote, even though
 * they can't vote and the server resolves the vote without them.
 */
describe('VotingSystem: council vote with an observer in the room', () => {
  const voters = [me, other, makePlayer({ name: 'Watts' })];
  const observer = makePlayer({ name: 'Olu' });
  const roomWithObserver = makeRoom({
    players: [...voters, observer],
    activePlayerIds: voters.map((p) => p.id),
    gameStarted: true,
    proposedTeam: [me.id, other.id],
    voting: makeVotingState({ active: true, type: 'teamApproval', votes: {} }),
  });

  function renderCouncil() {
    render(
      <VotingSystem
        room={roomWithObserver} playerId={me.id} isGameMaster={false} primaryBtn={{}}
        handleYesVote={vi.fn()} handleNoVote={vi.fn()} handleClearVote={vi.fn()}
        handleStartVote={vi.fn()} handleStartSecretVote={vi.fn()}
      />,
    );
  }

  it('counts only the battalion: 3 votes needed, not 4', () => {
    renderCouncil();
    // "Progress: 0 / 3". The numbers sit in separate text nodes, so match the
    // whole line's text.
    expect(screen.getByText((_, el) => el?.textContent === 'Progress: 0 / 3')).toBeInTheDocument();
  });

  it('never waits on the observer', () => {
    renderCouncil();
    expect(screen.getByText('Watts')).toBeInTheDocument(); // a voter who hasn't voted is listed
    expect(screen.queryByText('Olu')).toBeNull();
  });
});
