import type { Player, VotingState } from '../../types/game';

type Votes = VotingState['votes'];

/**
 * Whether `playerId` has cast a vote, under either wire format the backend can
 * send: `"yes"` / `"no"` once revealed, or `true` while a secret vote is still
 * active and redacted.
 *
 * Deliberately NOT `playerId in votes` — under the redacted format the backend
 * may pre-populate every player's id with `false` ("hasn't voted yet") so that
 * clients can render a full roster before anyone acts. Under that shape, key
 * presence is true for every player from the start; only the boolean value
 * distinguishes "voted" from "hasn't".
 */
export function hasPlayerVoted(votes: Votes, playerId: string): boolean {
  const value = votes[playerId];
  return value === 'yes' || value === 'no' || value === true;
}

/** How many of `votes` represent an actual cast vote (redacted or revealed). */
export function votesCastCount(votes: Votes): number {
  return Object.keys(votes).filter((playerId) => hasPlayerVoted(votes, playerId))
    .length;
}

/**
 * The players in `eligiblePlayerIds` who have not yet voted, in roster order.
 * `eligiblePlayerIds` is the caller's job to narrow: all players for a team
 * approval vote, or just the proposed team for a secret mission vote.
 */
export function pendingVoters(
  players: Player[],
  votes: Votes,
  eligiblePlayerIds: string[],
): Player[] {
  return players.filter(
    (p) => eligiblePlayerIds.includes(p.id) && !hasPlayerVoted(votes, p.id),
  );
}

/**
 * Counts of revealed "yes"/"no" votes. Only meaningful once voting has
 * closed and the backend has replaced any redacted `true` placeholders with
 * the actual choice — a `true` value carries no yes/no information and is
 * excluded from both counts rather than guessed at.
 */
export function voteTally(votes: Votes): { yes: number; no: number } {
  const values = Object.values(votes);
  return {
    yes: values.filter((v) => v === 'yes').length,
    no: values.filter((v) => v === 'no').length,
  };
}
