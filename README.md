# Sheba Medical Center — Ukrainian site

Static multi-page site (plain HTML/CSS/JS, no framework, no runtime
dependencies).

## Structure

```
/               Головна
/pro-sheba/     Про Sheba
/napriamy-likuvannia/   Напрями лікування (catalog)
/likari/        Лікарі (catalog, demo data)
/medychnyi-turyzm/      Медичний туризм
/kontakty/      Контакти

css/style.css   Shared styles
js/main.js      Shared behavior (mobile nav, form demo-submit)
assets/         Icons, favicon, temporary dev-reference photos
build.js        Build script — see below
```

## Editing the header, footer or contact form

The header, footer and the consultation-form markup are **not**
duplicated across the 6 HTML files. They live once in `build.js`
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

## Deploy

Pushing to `main` is picked up automatically by the existing Cloudflare
Workers deployment for this project (`sheba.cooklook770.workers.dev`)
— no manual `wrangler deploy` needed.
