import type { Lang } from '../../i18n/core';

// The steps of the illustrated walkthrough on the How to play page, in English
// (WALKTHROUGH) and Bangla (WALKTHROUGH_BN, same ids in the same order).
//
// Each step has two screenshots per language: `<id>-phone.webp` and
// `<id>-desktop.webp` in public/walkthrough/ (English) and
// public/walkthrough/bn/ (Bangla), made by `npm run walkthrough:shots` (see
// that script for how). Button names in **bold** match the labels in the game
// (src/i18n/en.ts and bn.ts); keep them in step when the UI changes, and
// re-run the script.

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

export const WALKTHROUGH_BN: WalkthroughStep[] = [
  {
    id: 'create-room',
    title: 'রুম তৈরি করুন',
    who: 'হোস্ট',
    text: 'ধাপ ১-এ একটি ছদ্মনাম লিখুন, তারপর **নতুন ঘাঁটি স্থাপন করুন** চাপুন। যিনি রুম তৈরি করেন তিনিই হোস্ট, আর তিনিই খেলা পরিচালনা করেন।',
    alt: 'শুরুর স্ক্রিনে ছদ্মনাম লেখা, আর নতুন ঘাঁটি স্থাপন করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'share-code',
    title: 'রুমের কোড শেয়ার করুন',
    who: 'হোস্ট',
    text: 'ছয় অক্ষরের রুম কোডটি আপনার নামের পাশে দেখা যায় (ফোনে কোড দেখতে আপনার নামের বারে ট্যাপ করুন)। কোডটি পড়ে শোনান, অথবা **সঙ্গীদের আমন্ত্রণ** চেপে একটি লিংক কপি করুন; লিংকটি খুললে বন্ধুদের জন্য কোড আপনা থেকেই বসে যায়।',
    alt: 'হোস্টের স্ক্রিনে রুম কোড আর সঙ্গীদের আমন্ত্রণ বোতাম, দুটোই চিহ্নিত।',
  },
  {
    id: 'join-room',
    title: 'রুমে যোগ দিন',
    who: 'বাকি সবাই',
    text: 'একটি ছদ্মনাম লিখুন, "অথবা যোগ দিন"-এর নিচে রুম কোডটি লিখুন, তারপর **ঘাঁটিতে অনুপ্রবেশ করুন** চাপুন।',
    alt: 'শুরুর স্ক্রিনে রুম কোড লেখা, আর ঘাঁটিতে অনুপ্রবেশ করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'lobby',
    title: 'বাহিনী জড়ো করুন',
    who: 'হোস্ট',
    text: 'যে-ই যোগ দেয়, সে বাহিনীতে অন্তর্ভুক্ত হয়; তালিকায় কারও নামে ট্যাপ করলে তিনি দর্শক হয়ে যান। ৫ থেকে ১০ জন অন্তর্ভুক্ত হলে **যুদ্ধ শুরু করুন** চাপুন। তার আগে চাইলে গোপন তথ্য বন্ধ করতে পারেন, অথবা **রুম বন্ধ করুন** চেপে নতুন কারও যোগ দেওয়া আটকাতে পারেন।',
    alt: 'ছয়জন খেলোয়াড় নিয়ে হোস্টের অপেক্ষাঘর, আর যুদ্ধ শুরু করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'choose-characters',
    title: 'চরিত্র বেছে নিন',
    who: 'হোস্ট',
    text: 'মীর জাফর আর মীর মদন সবসময় থাকেন। দুই কলামের ওপরের সংখ্যা পূর্ণ না হওয়া পর্যন্ত দুই পক্ষের জন্য চরিত্র বাছাই করুন, তারপর **খেলা শুরু করুন** চাপুন। প্রত্যেক খেলোয়াড় এলোমেলোভাবে একটি করে চরিত্র পান।',
    alt: 'চরিত্র বাছাইয়ের পর্দায় দুই পক্ষই পূর্ণ, আর খেলা শুরু করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'identity',
    title: 'আপনার গোপন কার্ড পড়ুন',
    who: 'সবাই',
    text: 'আপনার চরিত্র আর পক্ষ দেখতে "গোপনীয়" কার্ডে ট্যাপ করুন; লুকাতে আবার ট্যাপ করুন। কিছু চরিত্র অন্য খেলোয়াড়দের সম্পর্কে **গোপন তথ্য**ও পান। আপনার স্ক্রিন কাউকে দেখাবেন না।',
    alt: 'খোলা চরিত্রের কার্ডে চরিত্র, নবাব পক্ষ আর গোপন তথ্যের তালিকা।',
  },
  {
    id: 'appoint-general',
    title: 'সেনাপতি নিয়োগ করুন',
    who: 'হোস্ট',
    text: '**সেনাপতি নিয়োগ করুন** চাপুন। খেলা একজন খেলোয়াড়কে বেছে নিয়ে সবাইকে জানিয়ে দেয়। প্রতি রাউন্ডের শুরুতে, আর বাহিনী প্রত্যাখ্যাত হলে, হোস্ট এটি আবার করেন।',
    alt: 'হোস্টের স্ক্রিনে সেনাপতি নিয়োগ করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'pick-team',
    title: 'বাহিনী বাছাই করুন',
    who: 'সেনাপতি',
    text: 'এই রাউন্ডের জন্য দেখানো সংখ্যক যোদ্ধা না হওয়া পর্যন্ত নামগুলোতে ট্যাপ করুন, তারপর **দরবারে ভোট শুরু করুন** চাপুন।',
    alt: 'সেনাপতির "আপনার বাহিনী গড়ুন" প্যানেলে দুজন খেলোয়াড় বাছাই করা, আর দরবারে ভোট শুরু করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'council-vote',
    title: 'অনুমোদন বা প্রত্যাখ্যান',
    who: 'সবাই',
    text: 'বাহিনী **অনুমোদন** করতে সবুজ সিলমোহরে, **প্রত্যাখ্যান** করতে লাল সিলমোহরে ট্যাপ করুন। সবার ভোট না হওয়া পর্যন্ত কে কী বেছেছেন তা গোপন থাকে। অর্ধেক বা তার বেশি প্রত্যাখ্যান করলে বাহিনী পাঠানো হয় না।',
    alt: 'দরবারের আলোচনার পর্দায় অনুমোদন আর প্রত্যাখ্যানের সিলমোহর চিহ্নিত।',
  },
  {
    id: 'verdict',
    title: 'বাহিনী পাঠান',
    who: 'হোস্ট',
    text: 'রায়ে দেখা যায় কে কীভাবে ভোট দিয়েছেন। বাহিনী অনুমোদিত হলে **গোপন ভোট নিন** চাপুন। প্রত্যাখ্যাত হলে **বন্ধ করুন** চেপে নতুন সেনাপতি নিয়োগ করুন।',
    alt: 'চূড়ান্ত রায়ের পর্দায় "অনুমোদিত" লেখা, আর গোপন ভোট নিন বোতামটি চিহ্নিত।',
  },
  {
    id: 'mission-vote',
    title: 'অভিযানে ভোট দিন',
    who: 'বাহিনীর সদস্যরা',
    text: 'শুধু বাহিনীর সদস্যরা গোপনে ভোট দেন: **সাফল্য** বা **নাশকতা** বেছে নিন। নবাব পক্ষ শুধু সাফল্যই চাইতে পারে, তাই নবাব পক্ষের কেউ নাশকতা বাছলেও তা সাফল্য হিসেবে গোনা হয়।',
    alt: 'গোপন ভোট দিন পর্দায় সাফল্য আর নাশকতার ব্যানার চিহ্নিত।',
  },
  {
    id: 'confirm-vote',
    title: 'ভোট নিশ্চিত করুন',
    who: 'বাহিনীর সদস্যরা',
    text: 'সিদ্ধান্ত পাকা করতে **নিশ্চিত করুন** চাপুন, বদলাতে চাইলে **ফিরে যান** চাপুন।',
    alt: '"আপনার সিদ্ধান্ত নিশ্চিত করুন" পর্দায় নিশ্চিত করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'mission-result',
    title: 'ফলাফল দেখুন',
    who: 'সবাই; হোস্ট খেলা এগিয়ে নেন',
    text: 'ফলাফলে দেখা যায় কতজন সাফল্য আর কতজন নাশকতা বেছেছেন, কিন্তু কে কোনটা বেছেছেন তা কখনও নয়। একটি নাশকতাতেই রাউন্ড হারতে হয় (৭ বা তার বেশি খেলোয়াড় হলে চতুর্থ রাউন্ডে দুটি লাগে)। এগোতে হোস্ট **বন্ধ করুন** চাপেন।',
    alt: 'চূড়ান্ত রায়ের পর্দায় "অভিযান সফল" লেখা, আর বন্ধ করুন বোতামটি চিহ্নিত।',
  },
  {
    id: 'round-tracker',
    title: 'যুদ্ধের অগ্রগতি দেখুন',
    who: 'সবাই',
    text: 'পাঁচটি বৃত্ত রাউন্ডগুলোর হিসাব রাখে: সফল রাউন্ড সবুজ, ব্যর্থ রাউন্ড লাল, আর চলতি রাউন্ডের চারপাশে সাদা বলয়। প্রতিটি বৃত্তের নিচের লেখাটি সেই রাউন্ডের বাহিনীর আকার।',
    alt: 'রাউন্ডের হিসাবে দুটি সবুজ রাউন্ড আর তৃতীয়টি চলমান, চিহ্নিত।',
  },
  {
    id: 'guptochor',
    title: 'গুপ্তচর কাজে লাগান',
    who: 'গুপ্তচর',
    text: 'তৃতীয় রাউন্ড থেকে গুপ্তচর একজন খেলোয়াড়ের খোঁজ নিতে পারেন: তালিকায় তার নামের পাশে **গুপ্তচর** চাপুন (ফোনে আগে "সমবেত" তালিকাটি খুলুন)। তার পক্ষ শুধু আপনিই দেখবেন; বাকিরা শুধু জানবেন যে একটি খোঁজ নেওয়া হয়েছে।',
    alt: 'তালিকায় প্রত্যেক খেলোয়াড়ের পাশে গুপ্তচর বোতাম, প্রথমটি চিহ্নিত।',
  },
  {
    id: 'mir-jafor',
    title: 'মীর জাফরের শেষ আঘাত',
    who: 'মীর জাফর',
    text: 'নবাব পক্ষ তিনটি রাউন্ড জিতলে মীর জাফর সেই খেলোয়াড়ের নাম বলেন যাকে তিনি মীর মদন মনে করেন। অনুমান ঠিক হলে বাংলা কোম্পানির হাতে যায়; ভুল হলে নবাব পক্ষ জেতে।',
    alt: 'শেষ বিশ্বাসঘাতকতার পর্দায় খেলোয়াড়দের তালিকা, একটি নাম চিহ্নিত।',
  },
  {
    id: 'game-over',
    title: 'খেলা শেষ',
    who: 'সবাই; এরপর কী হবে তা হোস্ট ঠিক করেন',
    text: 'বিজয়ী ঘোষণা করা হয় আর সবার কার্ড প্রকাশ পায়। একই খেলোয়াড়দের নিয়ে অপেক্ষাঘরে ফিরতে হোস্ট **নতুন যুদ্ধের প্রস্তুতি নিন** চাপেন, আর রুম শেষ করতে **ঘাঁটি বন্ধ করুন** চাপেন।',
    alt: 'ফলাফলের পর্দায় নবাব পক্ষের জয়ের ঘোষণা, আর নতুন যুদ্ধের প্রস্তুতি নিন বোতামটি চিহ্নিত।',
  },
];

/** The walkthrough in a language. */
export function walkthroughFor(lang: Lang): WalkthroughStep[] {
  return lang === 'bn' ? WALKTHROUGH_BN : WALKTHROUGH;
}

export type ShotSize = 'phone' | 'desktop';

/** Pixel sizes of the saved screenshots, for layout before they load. */
export const SHOT_SIZE: Record<ShotSize, { width: number; height: number }> = {
  phone: { width: 600, height: 1298 },
  desktop: { width: 1440, height: 900 },
};

/** Where a screenshot is. The Bangla ones show the game in Bangla. */
export function shotUrl(id: string, size: ShotSize, lang: Lang = 'en'): string {
  return `/walkthrough/${lang === 'bn' ? 'bn/' : ''}${id}-${size}.webp`;
}
