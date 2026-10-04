// The steps of the illustrated walkthrough on the How to play page.
//
// Each step has two screenshots in public/walkthrough/: `<id>-phone.webp` and
// `<id>-desktop.webp`, made by `npm run walkthrough:shots` (see that script for
// how). Button names in **bold** match the labels in the game; keep them in
// step when the UI changes, and re-run the script.

export type WalkthroughStep = {
  id: string;
  title: string;
  /** Whose screen the step happens on. */
  who: string;
  /** What to do. `**text**` is shown in bold. */
  text: string;
  /** Describes the screenshot for screen readers. */
  alt: string;
};

export const WALKTHROUGH: WalkthroughStep[] = [
  {
    id: 'create-room',
    title: 'Create a room',
    who: 'Host',
    text: 'Type an alias under Step 1, then press **Establish New HQ**. Whoever creates the room is the host and runs the game.',
    alt: 'The start screen with an alias typed in and the Establish New HQ button outlined.',
  },
  {
    id: 'share-code',
    title: 'Share the room code',
    who: 'Host',
    text: 'The six-character room code appears next to your name (on a phone, tap your name bar to show it). Read it out, or press **Invite Allies** to copy a link that fills the code in for your friends.',
    alt: 'The host’s screen showing the room code and the Invite Allies button, both outlined.',
  },
  {
    id: 'join-room',
    title: 'Join the room',
    who: 'Everyone else',
    text: 'Type an alias, enter the room code under Or join, and press **Infiltrate Existing HQ**.',
    alt: 'The start screen with a room code entered and the Infiltrate Existing HQ button outlined.',
  },
  {
    id: 'lobby',
    title: 'Gather the battalion',
    who: 'Host',
    text: 'Everyone who joins is drafted into the battalion; tap a name in the roster to stand them down as an observer. With 5 to 10 players drafted, press **Begin Campaign**. Before that you can switch off Secret Intel, or press **Secure Room** so nobody else can join.',
    alt: 'The host’s lobby with six players ready and the Begin Campaign button outlined.',
  },
  {
    id: 'choose-characters',
    title: 'Choose the characters',
    who: 'Host',
    text: 'Mir Jafor and Mir Madan are always in. Pick characters for each side until the counts at the top of both columns are full, then press **Start Game**. Each player is dealt one at random.',
    alt: 'The character picker with both sides full and the Start Game button outlined.',
  },
  {
    id: 'identity',
    title: 'Read your secret card',
    who: 'Everyone',
    text: 'Tap the Classified card to see your character and side; tap again to hide it. Some characters also get **Secret Intelligence** about other players. Keep your screen to yourself.',
    alt: 'A revealed character card showing the character, the Nawabs side and a Secret Intelligence list.',
  },
  {
    id: 'appoint-general',
    title: 'Appoint a General',
    who: 'Host',
    text: 'Press **Appoint General**. The game picks a player and announces them to everyone. The host does this at the start of every round, and again after a rejected battalion.',
    alt: 'The host’s screen with the Appoint General button outlined.',
  },
  {
    id: 'pick-team',
    title: 'Pick the battalion',
    who: 'The General',
    text: 'Tap names until the battalion is the size shown for this round, then press **Initiate Council Vote**.',
    alt: 'The General’s Assemble Your Battalion panel with two players chosen and the Initiate Council Vote button outlined.',
  },
  {
    id: 'council-vote',
    title: 'Approve or reject',
    who: 'Everyone',
    text: 'Tap the green seal to **Approve** the battalion or the red seal to **Reject** it. Choices stay hidden until everyone has voted. If half or more reject it, the battalion is not sent.',
    alt: 'The Council Deliberation screen with the Approve and Reject seals outlined.',
  },
  {
    id: 'verdict',
    title: 'Send the battalion',
    who: 'Host',
    text: 'The verdict shows how everyone voted. If the battalion is approved, press **Take Secret Vote**. If it was rejected, press **Dismiss** and appoint a new General.',
    alt: 'The Final Verdict screen showing Approved, with the Take Secret Vote button outlined.',
  },
  {
    id: 'mission-vote',
    title: 'Vote on the mission',
    who: 'Players in the battalion',
    text: 'Only the battalion votes, in secret: choose **Success** or **Sabotage**. Nawabs can only succeed, so a Nawab’s sabotage counts as a success.',
    alt: 'The Cast Secret Vote screen with the Success and Sabotage banners outlined.',
  },
  {
    id: 'confirm-vote',
    title: 'Confirm your vote',
    who: 'Players in the battalion',
    text: 'Press **Confirm** to lock in your choice, or **Go Back** to change it.',
    alt: 'The Confirm Your Choice screen with the Confirm button outlined.',
  },
  {
    id: 'mission-result',
    title: 'See the result',
    who: 'Everyone; the host moves on',
    text: 'The result shows how many chose success and how many sabotage, never who. One sabotage loses the round (two in round 4 with 7 or more players). The host presses **Dismiss** to continue.',
    alt: 'The Final Verdict screen showing Mission Success, with the Dismiss button outlined.',
  },
  {
    id: 'round-tracker',
    title: 'Follow the campaign',
    who: 'Everyone',
    text: 'The five circles track the rounds: green for a success, red for a failure, and a white ring for the round being played. The label under each circle is its battalion size.',
    alt: 'The round tracker with two green rounds and the third in progress, outlined.',
  },
  {
    id: 'guptochor',
    title: 'Use the Guptochor',
    who: 'The Guptochor',
    text: 'From round 3, the Guptochor may investigate one player: press **Spy** next to their name in the roster (on a phone, open the Marshalled list first). Only you see their side; everyone is told an investigation happened.',
    alt: 'The roster with a Spy button next to each player, the first one outlined.',
  },
  {
    id: 'mir-jafor',
    title: 'Mir Jafor’s final strike',
    who: 'Mir Jafor',
    text: 'If the Nawabs win three rounds, Mir Jafor names the player he thinks is Mir Madan. A right guess hands Bengal to the Company; a wrong one and the Nawabs win.',
    alt: 'The Final Betrayal screen with a list of players and one name outlined.',
  },
  {
    id: 'game-over',
    title: 'Game over',
    who: 'Everyone; the host decides what next',
    text: 'The winner is announced and every card is revealed. The host presses **Prepare New Campaign** to return to the lobby with the same players, or **Close HQ** to end the room.',
    alt: 'The result screen announcing that the Nawabs win, with the Prepare New Campaign button outlined.',
  },
];

export type ShotSize = 'phone' | 'desktop';

/** Pixel sizes of the saved screenshots, for layout before they load. */
export const SHOT_SIZE: Record<ShotSize, { width: number; height: number }> = {
  phone: { width: 600, height: 1298 },
  desktop: { width: 1440, height: 900 },
};

export function shotUrl(id: string, size: ShotSize): string {
  return `/walkthrough/${id}-${size}.webp`;
}
