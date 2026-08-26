# MEDHUB — авторизований представник Sheba Medical Center в Україні

Static multi-page site (plain HTML/CSS/JS, no framework, no runtime
dependencies).

Public brand: **MEDHUB**. Sheba Medical Center is the Israeli hospital
MEDHUB represents in Ukraine — see `LEGAL_DISCLOSURE` in `build.js` for
the exact relationship wording used site-wide (header subtitle, footer
disclosure block, `/pro-medhub/`).

> **Domain note:** all canonical/OG URLs use `https://medhub.group` per
> spec, but that domain is **not registered/pointed yet** (confirmed via
> DNS lookup — NXDOMAIN). The site is actually reachable today only at
> the Cloudflare Workers URL below. Once `medhub.group` is registered,
> add it as a Custom Domain to the `sheba` Worker in the Cloudflare
> dashboard (or `wrangler.toml` `[[routes]]`) — no code changes needed.

## Structure

```
/                        Головна
/pro-medhub/              Про MEDHUB
/sheba-medical-center/    Sheba Medical Center
/napriamy-likuvannia/     Напрями лікування (catalog)
/likari/                  Лікарі Sheba Medical Center (catalog, demo data)
/patsiientam/             Пацієнтам (guide + FAQ)
/kontakty/                Контакти MEDHUB

css/style.css   Shared styles (MEDHUB palette as CSS variables, see :root)
js/main.js      Shared behavior (mobile nav, form demo-submit)
assets/brand/   MEDHUB logo assets (mark, full lockup, favicon, PNG)
assets/         Icons, temporary dev-reference photos
build.js        Build script — see below
```

## Editing the header, footer or contact form

The header, footer and the consultation-form markup are **not**
duplicated across the HTML files. They live once in `build.js`
(`renderHeader`, `renderFooter`, `renderConsultationForm`). Edit them
there, then regenerate the static pages:

```
node build.js
```

This overwrites `index.html` and the `*/index.html` files for every
page listed in `build.js`'s `pages` array. The generated HTML files
are what actually gets committed and deployed — `build.js` itself
does not run at request time, so always re-run it (and commit the
result) after touching header/footer/form markup or adding a page.

## Adding a new page

Add an entry to the `pages` array in `build.js` (slug, output path,
`<title>`/description, and the page's inner HTML), add it to the `NAV`
array if it should appear in the menu, then run `node build.js`.

## Brand colors

Exact values extracted from `assets/brand/medhub-logo.svg` (logo
variant "a2") — see `:root` in `css/style.css`: `--medhub-blue`
(#2315FF, primary), `--medhub-bright` (#0068FF, secondary), `--medhub-dark`
(#0000C1, header/footer), `--medhub-yellow` (#FCEE21, sparse accent only).

## Structured data

Two separate JSON-LD entities on pages that mention both — MEDHUB as
`Organization`, Sheba Medical Center as `MedicalOrganization` — never
merged (see `MEDHUB_SCHEMA` / `SHEBA_SCHEMA` in `build.js`).

## Deploy

Pushing to `main` has been picked up automatically by the existing
Cloudflare Workers deployment for this project in past sessions. If a
push doesn't show up live, deploy explicitly from this directory:

```
wrangler deploy
```

`wrangler.toml` configures static-asset serving with
`html_handling = "auto-trailing-slash"` (so `/kontakty/` resolves to
`kontakty/index.html`) and a real `404.html` for unmatched paths.
`.assetsignore` keeps `build.js`, `wrangler.toml`, `README.md` and
`.git` out of what's actually served.
