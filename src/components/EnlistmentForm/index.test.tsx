/**
 * EnlistmentForm — full test coverage.
 *
 * This form is entirely controlled from outside: `name`, `roomCode`, and
 * `loadingAction` are all props, not internal state, and every mutation goes
 * through a callback prop (`setName`, `setRoomCode`, `createRoom`, `joinRoom`).
 * That makes it a clean case for two things this level is about: typing into
 * a controlled input, and disabled-state logic driven by combinations of
 * props rather than a single flag.
 */

import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EnlistmentForm from './index';
import { makeRoom } from '../../../tests/factories';

// `cardStyle`/`inputStyle`/`primaryBtn` are just inline style objects passed
// down from the parent for visual consistency — nothing about them affects
// behavior, so an empty object is a perfectly valid stand-in for every test.
function baseProps() {
  return {
    room: null,
    wasKicked: false,
    name: '',
    setName: vi.fn(),
    roomCode: '',
    setRoomCode: vi.fn(),
    loadingAction: null as 'create' | 'join' | null,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    cardStyle: {},
    inputStyle: {},
    primaryBtn: {},
  };
}

describe('EnlistmentForm', () => {
  describe('the guard clause', () => {
    // `if (room || wasKicked) return null` — an OR of two independent
    // conditions. Testing only "both true" or only "both false" would leave
    // a broken `||` (e.g. accidentally written as `&&`) undetected — each
    // condition needs its own test where it's the ONLY reason to hide.
    it('renders nothing once a room exists', () => {
      const { container } = render(
        <EnlistmentForm {...baseProps()} room={makeRoom()} wasKicked={false} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing after being kicked, even with no room', () => {
      const { container } = render(
        <EnlistmentForm {...baseProps()} room={null} wasKicked={true} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders the form when there is no room and the player was not kicked', () => {
      render(<EnlistmentForm {...baseProps()} />);
      expect(screen.getByPlaceholderText('Enter Alias...')).toBeInTheDocument();
    });
  });

  describe('typing', () => {
    // WHY A SPY ALONE DOESN'T WORK HERE, AND WHAT DOES
    //
    // `<input value={name} onChange={...} />` is a CONTROLLED input: React
    // treats `name` as the single source of truth and enforces it on the DOM
    // after every change event, not just on an unrelated re-render. If
    // `setName` is a bare `vi.fn()` that doesn't update real state, `name`
    // stays '' forever — so after typing "A", React resets the field's real
    // value back to '' before the next keystroke, and every `onChange` fires
    // with just the ONE character most recently typed, never an accumulated
    // string. (This surprised me writing it — I originally assumed the DOM
    // would accumulate keystrokes untouched between renders, the way an
    // uncontrolled input does. It doesn't, precisely because this input IS
    // controlled: enforcing the prop value back onto the DOM after every
    // keystroke is the whole mechanism that makes "controlled" mean anything.)
    //
    // The fix used below: a small wrapper component that holds REAL state and
    // passes it through, the same way the actual parent
    // (`GameDashboard`) does. This is a standard, necessary pattern for
    // testing any controlled input — a name worth knowing: without it, you
    // can only ever prove "one keystroke reported correctly", never "the
    // field ends up showing what the user actually typed".
    function ControlledHarness(overrides: Partial<ReturnType<typeof baseProps>> = {}) {
      const [name, setName] = useState(overrides.name ?? '');
      const [roomCode, setRoomCode] = useState(overrides.roomCode ?? '');
      return (
        <EnlistmentForm
          {...baseProps()}
          {...overrides}
          name={name}
          setName={setName}
          roomCode={roomCode}
          setRoomCode={setRoomCode}
        />
      );
    }

    it('shows what was typed in the alias field', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);

      await user.type(screen.getByPlaceholderText('Enter Alias...'), 'Alice');

      // Asserting the RENDERED VALUE, not a spy's call history — this is the
      // outcome a player actually sees, and it only reads correctly because
      // the harness above makes `setName` real.
      expect(screen.getByPlaceholderText('Enter Alias...')).toHaveValue('Alice');
    });

    it('upper-cases whatever is typed into the HQ code field', async () => {
      const user = userEvent.setup();
      render(<ControlledHarness />);

      await user.type(screen.getByPlaceholderText('Enter HQ Code'), 'abcd');

      // The component does `setRoomCode(e.target.value.toUpperCase())` before
      // the value ever reaches state — so what shows up in the field is the
      // UPPER-CASED form, never the raw lowercase keys that were pressed.
      // That's what actually proves the transform ran, not just that typing
      // works at all.
      expect(screen.getByPlaceholderText('Enter HQ Code')).toHaveValue('ABCD');
    });

    it('still reports a single keystroke correctly without the harness', async () => {
      // Keeping ONE spy-based test alongside the harness ones on purpose —
      // it isolates the handler itself (does `onChange` fire at all, with
      // what argument) from the rendering/controlled-value machinery above.
      // A SINGLE character never hits the reset problem described above
      // (there's no PRIOR keystroke to have been wiped by a fixed prop yet),
      // so no harness is needed for just this one assertion.
      //
      // Tried first, and worth knowing as a dead end: manually doing
      // `input.value = 'A'; input.dispatchEvent(new Event('input'))` here
      // does NOT work — it fires 0 times. React tracks input changes through
      // its own wrapped version of the native `value` SETTER specifically so
      // it can tell real user input apart from a script poking `.value`
      // directly; assigning `.value` bypasses that tracked setter entirely,
      // so React's synthetic `onChange` never sees it. `user-event` goes
      // through real key-dispatch (as if a browser typed it), which does
      // trigger the tracked setter — that's the actual reason to prefer it
      // over hand-rolled DOM events for anything React-controlled.
      const user = userEvent.setup();
      const setName = vi.fn();
      render(<EnlistmentForm {...baseProps()} setName={setName} />);

      await user.type(screen.getByPlaceholderText('Enter Alias...'), 'A');

      expect(setName).toHaveBeenCalledExactlyOnceWith('A');
    });
  });

  describe('"Establish New HQ" — enabled only with a name and no room code', () => {
    // A rule with three independent reasons to be disabled
    // (`!name || !!loadingAction || !!roomCode`) is exactly the shape Level 1
    // called a table-driven rule, now proven by rendering instead of reading
    // source. Each row changes exactly one variable from the "should be
    // enabled" baseline, so a failure tells you which condition broke.
    it.each([
      { name: 'Alice', roomCode: '', loadingAction: null, expectDisabled: false, label: 'baseline: name set, no room code, not loading' },
      { name: '', roomCode: '', loadingAction: null, expectDisabled: true, label: 'no name' },
      { name: 'Alice', roomCode: 'ABCD', loadingAction: null, expectDisabled: true, label: 'a room code is also present (can\'t create AND join)' },
      { name: 'Alice', roomCode: '', loadingAction: 'create' as const, expectDisabled: true, label: 'a create request is already in flight' },
      { name: 'Alice', roomCode: '', loadingAction: 'join' as const, expectDisabled: true, label: 'a join request is in flight (still blocks create)' },
    ])('$label -> disabled: $expectDisabled', ({ name, roomCode, loadingAction, expectDisabled }) => {
      render(
        <EnlistmentForm {...baseProps()} name={name} roomCode={roomCode} loadingAction={loadingAction} />,
      );

      const button = screen.getByRole('button', { name: /Establish New HQ/ });
      if (expectDisabled) {
        expect(button).toBeDisabled();
      } else {
        expect(button).toBeEnabled();
      }
    });

    it('calls createRoom when clicked while enabled', async () => {
      const user = userEvent.setup();
      const createRoom = vi.fn();
      render(<EnlistmentForm {...baseProps()} name="Alice" createRoom={createRoom} />);

      await user.click(screen.getByRole('button', { name: /Establish New HQ/ }));

      expect(createRoom).toHaveBeenCalledOnce();
    });

    it('does not call createRoom when clicked while disabled', async () => {
      // `user.click` on a real `disabled` button never fires — this is
      // user-event modelling actual browser physics, unlike `fireEvent.click`
      // which would dispatch the event regardless of the `disabled`
      // attribute. That difference is worth knowing: `fireEvent` fires an
      // event; `user-event` simulates a user, and a user can't click through
      // a disabled button.
      const user = userEvent.setup();
      const createRoom = vi.fn();
      render(<EnlistmentForm {...baseProps()} name="" createRoom={createRoom} />);

      await user.click(screen.getByRole('button', { name: /Establish New HQ/ }));

      expect(createRoom).not.toHaveBeenCalled();
    });
  });

  describe('"Infiltrate Existing HQ" — enabled only with both a name and a room code', () => {
    it.each([
      { name: 'Alice', roomCode: 'ABCD', loadingAction: null, expectDisabled: false, label: 'baseline: name and room code set, not loading' },
      { name: '', roomCode: 'ABCD', loadingAction: null, expectDisabled: true, label: 'no name' },
      { name: 'Alice', roomCode: '', loadingAction: null, expectDisabled: true, label: 'no room code' },
      { name: 'Alice', roomCode: 'ABCD', loadingAction: 'join' as const, expectDisabled: true, label: 'a join request is already in flight' },
    ])('$label -> disabled: $expectDisabled', ({ name, roomCode, loadingAction, expectDisabled }) => {
      render(
        <EnlistmentForm {...baseProps()} name={name} roomCode={roomCode} loadingAction={loadingAction} />,
      );

      const button = screen.getByRole('button', { name: /Infiltrate Existing HQ/ });
      if (expectDisabled) {
        expect(button).toBeDisabled();
      } else {
        expect(button).toBeEnabled();
      }
    });

    it('calls joinRoom when clicked while enabled', async () => {
      const user = userEvent.setup();
      const joinRoom = vi.fn();
      render(
        <EnlistmentForm {...baseProps()} name="Alice" roomCode="ABCD" joinRoom={joinRoom} />,
      );

      await user.click(screen.getByRole('button', { name: /Infiltrate Existing HQ/ }));

      expect(joinRoom).toHaveBeenCalledOnce();
    });
  });

  describe('the HQ code field itself is disabled while any action is loading', () => {
    // Not just the buttons — the input this button's value comes from also
    // locks, so a player can't edit the code mid-request. `loadingAction`
    // being EITHER "create" or "join" should both disable it (the field
    // reads `disabled={!!loadingAction}`, not `=== "join"`).
    it.each(['create', 'join'] as const)(
      'disables the HQ code input while loadingAction is "%s"',
      (loadingAction) => {
        render(<EnlistmentForm {...baseProps()} loadingAction={loadingAction} />);
        expect(screen.getByPlaceholderText('Enter HQ Code')).toBeDisabled();
      },
    );

    it('leaves the HQ code input enabled when nothing is loading', () => {
      render(<EnlistmentForm {...baseProps()} loadingAction={null} />);
      expect(screen.getByPlaceholderText('Enter HQ Code')).toBeEnabled();
    });
  });
});
