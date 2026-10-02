# Source art

Inputs for `npm run assets` (scripts/build-assets.mjs), which writes the derived
images and the splash video into `public/`. Keep these committed so the outputs
can be regenerated.

The files here are drawn from code by `npm run art` (scripts/draw-art.mjs):
original vector artwork with no text, letters or dates. To use hand-made or
generated art instead, replace a PNG with one of the same name and run
`npm run assets`.

| File | Used for |
|---|---|
| `key-art-portrait.png` | `polashi_bg.webp` / `.jpg` (splash background and video poster), lightning frames of `polashi_bg.mp4` |
| `key-art-portrait-calm.png` | the rest of `polashi_bg.mp4` (same scene, no lightning) |
| `key-art-wide.png` | `og-image.jpg` (1200x630 share image) |
| `seal-nawab.png` | `Nawab.png`, favicons and PWA icons |
| `seal-eic.png` | `EIC.png` |
| `seal-observer.png` | `Observer.png` |
| `token-approve.png` / `token-reject.png` | `green_seal.png` / `red_seal.png` (council vote) |
| `banner-nawab.png` / `banner-eic.png` | `green_card.png` / `red_card.png` (mission vote) |

When a source is missing, that output is skipped and the file in `public/` is kept.

The video step needs ffmpeg. It uses `$FFMPEG_PATH` if set, otherwise `ffmpeg`
on PATH, and is skipped with a warning when neither is available.
