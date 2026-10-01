# Source art

Inputs for `npm run assets` (scripts/build-assets.mjs), which writes the derived
images into `public/`. Keep these committed so the outputs can be regenerated.

| File | Used for | If missing |
|---|---|---|
| `key-art-portrait.png` | `polashi_bg.webp` / `.jpg` (splash video poster) | falls back to `legacy/polashi_bg_high_res.png` |
| `key-art-wide.png` | `og-image.jpg` (1200x630 share image) | crops the battlefield band out of the legacy art |
| `seal-nawab.png` | favicons, PWA icons, `green_seal.png`, `Nawab.png` | icons come from `public/Nawab.png`; seals unchanged |
| `seal-eic.png` | `red_seal.png`, `EIC.png` | seals unchanged |

Source art should contain no text. Titles are added by the script.

`legacy/polashi_bg_high_res.png` is the previous background. Its EIC seal reads
"1814" (the battle was in 1757) and the title is painted in, so it is only an
interim fallback until the new key art is added.
