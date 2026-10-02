# Source art

Inputs for `npm run assets` (scripts/build-assets.mjs), which writes the derived
images and the splash video into `public/`. Keep these committed so the outputs
can be regenerated.

The background and share image are generated illustrations supplied by hand.
The game pieces (seals, vote tokens, mission banners) are drawn from code by
`npm run art` (scripts/draw-art.mjs), with no text, letters or dates. To change
any of them, replace a PNG with one of the same name and run `npm run assets`.
`npm run art` never touches the key art unless you pass `--key-art`, which
redraws the original vector versions.

| File | Used for |
|---|---|
| `key-art-portrait.png` | `polashi_bg.webp` / `.jpg` (splash background and video poster) and `polashi_bg.mp4` (slow push-in, lightning flashes made by brightening the image) |
| `key-art-portrait-calm.png` | optional: the same scene without lightning; when present the video cuts between the two instead of brightening |
| `og-image.png` | `og-image.jpg` (1200x630 share image), used as is because the title is already painted in |
| `key-art-wide.png` | only when there's no `og-image.png`: a textless wide scene that gets the title added by the script |
| `seal-nawab.png` | `Nawab.png`, favicons and PWA icons |
| `seal-eic.png` | `EIC.png` |
| `seal-observer.png` | `Observer.png` |
| `token-approve.png` / `token-reject.png` | `green_seal.png` / `red_seal.png` (council vote) |
| `banner-nawab.png` / `banner-eic.png` | `green_card.png` / `red_card.png` (mission vote) |

When a source is missing, that output is skipped and the file in `public/` is kept.

The video step needs ffmpeg. It uses `$FFMPEG_PATH` if set, otherwise `ffmpeg`
on PATH, and is skipped with a warning when neither is available.
