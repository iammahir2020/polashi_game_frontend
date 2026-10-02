# Source art

Inputs for `npm run assets` (scripts/build-assets.mjs), which writes the derived
images and the splash video into `public/`. Keep these committed so the outputs
can be regenerated.

The background, share image and the three faction seals are generated
illustrations supplied by hand. The mission banners are drawn from code by
`npm run art` (scripts/draw-art.mjs). To change any of them, replace a PNG with
one of the same name and run `npm run assets`. `npm run art` never touches the
hand-supplied art unless you pass `--vector`, which redraws the original vector
versions.

| File | Used for |
|---|---|
| `key-art-portrait.png` | `polashi_bg.webp` / `.jpg` (splash background and video poster) and `polashi_bg.mp4` (slow push-in, lightning flashes made by brightening the image) |
| `key-art-portrait-calm.png` | optional: the same scene without lightning; when present the video cuts between the two instead of brightening |
| `og-image.png` | `og-image.jpg` (1200x630 share image), used as is because the title is already painted in |
| `key-art-wide.png` | only when there's no `og-image.png`: a textless wide scene that gets the title added by the script |
| `seal-nawab.png` | `Nawab.png` (Nawab badge), `green_seal.png` (council APPROVE), favicons, Apple touch icon and PWA icons |
| `seal-eic.png` | `EIC.png` (Company badge), `red_seal.png` (council REJECT) |
| `seal-observer.png` | `Observer.png` (observer badge) |
| `banner-nawab.png` / `banner-eic.png` | `green_card.png` / `red_card.png` (mission vote) |

### Generated images with a painted-in checkerboard

Image generators often export "transparent" art as a JPG with the grey-and-white
checkerboard drawn into the pixels. `originals/` keeps those as delivered; the
transparent PNGs above were made from them with:

```sh
node scripts/cutout-checkerboard.mjs art-src/originals/seal-nawab.jpg art-src/seal-nawab.png
```

It flood-fills the light, colourless checkerboard from the image border (so
highlights inside the object are kept), trims the result and centres it on a
1024 px square. Check the output on a dark and a bright background before use.

When a source is missing, that output is skipped and the file in `public/` is kept.

The video step needs ffmpeg. It uses `$FFMPEG_PATH` if set, otherwise `ffmpeg`
on PATH, and is skipped with a warning when neither is available.
