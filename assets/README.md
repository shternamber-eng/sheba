# Assets

## `temp-dev-refs/` — temporary, for visual QA only

This pass rebuilt the page to closely match the layout/photography
proportions of the reference page
(shebaonline.ru/medicinskij-turizm-v-izraile/). To make that comparison
possible, `assets/temp-dev-refs/` holds files pulled directly from that
page as **temporary development placeholders**, referenced from
`index.html`:

| File | Used for | Source |
|---|---|---|
| `hero-staff.jpg` | Hero section photo | shebaonline.ru hero image |
| `advantages-building.jpg` | Advantages section photo | shebaonline.ru building photo |
| `cta-consultation.jpg` | CTA band photo (doctor + patient) | shebaonline.ru CTA background |
| `title-band-bg.svg` | Decorative diagonal swoosh behind the H1 band | shebaonline.ru theme asset |
| `cta-ring.svg` | Decorative ring behind the CTA band text | shebaonline.ru theme asset |

**Before launch, replace the three JPGs with licensed Sheba Medical
Center photography** at the same crop/aspect ratio (hero ≈760×310,
advantages ≈535×420, CTA band = full-bleed portrait). Each `<img>` tag
in `index.html` is marked with:

```html
<!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
```

The two decorative SVGs (abstract color shapes, not photography) are
low-risk to keep or swap for an equivalent brand pattern — they contain
no photography or trademarked wordmark.

**Not copied:** the original site's actual logo files
(`sheba-hospital-logo.svg`, `footer-logo-sheba.png`) were intentionally
**not** reused — those are the source organization's literal trademark
artwork. `index.html` instead uses a hand-built placeholder mark
(navy/pink/teal swirl, see `.logo-mark` in `css/style.css`) that follows
the same layout slot (icon + wordmark + tagline) without tracing their
logo. Swap it for Sheba's actual approved logo file when available.

## Other placeholders

| Location | File to add | Notes |
|---|---|---|
| `<head>` — `og:image` | `assets/og-cover.jpg` (1200×630) | Social share cover image |
| `<head>` — favicon | `assets/favicon.svg` | Placeholder mark — replace with the official Sheba favicon |
| Header/footer logo | — | See "Not copied" above |
