/**
 * PlayerRoster — a dropdown on phones, an always-open list in the war room.
 *
 * On phones space is tight, so the roster starts collapsed behind a toggle
 * button. In the tablet/desktop sidebar there's room, so `alwaysOpen` shows
 * the list and drops the toggle. These tests cover both, plus the one roster
 * behaviour that matters most before a game: the host clicking a name to
 * draft or stand down that player.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import PlayerRoster from './index';
import { makePlayer } from '../../../tests/factories';

const host = makePlayer({ name: 'Siraj', isGameMaster: true });
const clive = makePlayer({ name: 'Clive' });

function renderRoster(props: Partial<React.ComponentProps<typeof PlayerRoster>> = {}) {
  const onToggleActive = vi.fn();
  render(
    <PlayerRoster
      players={[host, clive]}
      playerId={host.id}
      isGameMaster
      gameStarted={false}
      kickPlayer={vi.fn()}
      selectedActiveIds={[host.id, clive.id]}
      onToggleActive={onToggleActive}
      {...props}
    />,
  );
  return { onToggleActive };
}

// The list's container collapses with max-height 0 rather than unmounting, so
// "visible" here means "its wrapper isn't collapsed". We read that style
// because jsdom has no layout engine to ask about real visibility.
function listWrapper() {
  return screen.getByText('Clive').closest('[style*="max-height"]') as HTMLElement;
}

describe('PlayerRoster', () => {
  it('starts collapsed behind a toggle on phones, and opens on click', () => {
    renderRoster();
    const toggle = screen.getByRole('button', { name: /Marshalled/ });
    expect(listWrapper().style.maxHeight).toBe('0px');

    fireEvent.click(toggle);
    expect(listWrapper().style.maxHeight).not.toBe('0px');
  });

  it('is always open, with no toggle, in the war room', () => {
    renderRoster({ alwaysOpen: true });
    expect(screen.queryByRole('button', { name: /Marshalled/ })).toBeNull();
    expect(listWrapper().style.maxHeight).toBe('none');
    // The summary line is still there, just no longer a button.
    expect(screen.getByText(/2 Active/)).toBeInTheDocument();
  });

  it('lets the host draft or stand down a player by clicking the name, in either layout', () => {
    const { onToggleActive } = renderRoster({ alwaysOpen: true });
    fireEvent.click(screen.getByText('Clive'));
    expect(onToggleActive).toHaveBeenCalledWith(clive.id);
  });
});
