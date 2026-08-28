#!/usr/bin/env node
/**
 * Static site build script — no dependencies.
 *
 * Single source of truth for the header, footer and contact-form
 * markup shared across every page. Run `node build.js` after editing
 * anything in this file to regenerate the static HTML actually served
 * (index.html, pro-medhub/index.html, ...). The generated files are
 * what gets committed and deployed — this script does not run at
 * request time.
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://medhub.group';
const SITE_NAME = 'MEDHUB';
const SHEBA_NAME = 'Sheba Medical Center';
const REP_LINE = 'Авторизований представник Sheba Medical Center в Україні';
// Exact legal-status wording as given in the brief. If the real corporate
// documents use different wording, replace this constant — every place
// that states MEDHUB's relationship to Sheba pulls from here so there is
// exactly one string to correct.
const LEGAL_DISCLOSURE = "MEDHUB є авторизованим представником Sheba Medical Center в Україні та забезпечує організаційну координацію звернень пацієнтів. Медичні послуги в Ізраїлі надаються Sheba Medical Center та відповідними медичними підрозділами центру.";
const LEGAL_DISCLOSURE_EN = "MEDHUB is an authorized representative of Sheba Medical Center in Ukraine and provides organizational coordination of patient inquiries. Medical services in Israel are provided by Sheba Medical Center and its respective medical departments.";
const REP_LINE_EN = "Authorized representative of Sheba Medical Center in Ukraine";

// MEDHUB brand mark (logo variant "a2"), inline so it renders with zero
// extra requests. Exact paths/colors extracted from assets/brand/medhub-logo.svg
// — keep the two files in sync if the mark ever changes.
const MEDHUB_MARK_SVG = `<svg class="logo-mark" viewBox="0 0 81 81" fill="none" aria-hidden="true">
  <g transform="translate(-120,-114)">
    <path transform="matrix(1,0,0,-1,168.6267,162.771)" d="M0 0C-4.483-4.483-11.752-4.483-16.235 0-20.719 4.483-20.719 11.752-16.235 16.235-11.752 20.719-4.483 20.719 0 16.235 4.483 11.752 4.483 4.483 0 0" fill="#2315FF"/>
    <path transform="matrix(1,0,0,-1,170.364,141.0239)" d="M0 0 13.472 13.472C.09 25.014-19.799 25.014-33.182 13.472L-19.709 0C-13.847 4.249-5.862 4.249 0 0" fill="#FCEE21"/>
    <path transform="matrix(1,0,0,-1,146.8806,144.79929)" d="M0 0-13.473 13.473C-25.014 .091-25.014-19.799-13.473-33.181L0-19.708C-4.25-13.846-4.25-5.862 0 0" fill="#0068FF"/>
    <path transform="matrix(1,0,0,-1,150.655,168.2827)" d="M0 0-13.473-13.472C-.091-25.014 19.799-25.014 33.181-13.472L19.709 0C13.847-4.249 5.862-4.249 0 0" fill="#2315FF"/>
    <path transform="matrix(1,0,0,-1,187.6101,131.3266)" d="M0 0-13.472-13.473C-9.223-19.335-9.223-27.318-13.472-33.181L0-46.653C11.542-33.271 11.542-13.382 0 0" fill="#0000C1"/>
  </g>
</svg>`;

// ---------------------------------------------------------------------
// Nav model — single place that defines the site's pages & URLs.
// ---------------------------------------------------------------------

const NAV = [
  { slug: 'home', href: '/', label: 'Головна' },
  { slug: 'pro-medhub', href: '/pro-medhub/', label: 'Про MEDHUB' },
  { slug: 'sheba-medical-center', href: '/sheba-medical-center/', label: 'Sheba Medical Center' },
  { slug: 'sheba-ukraine', href: '/sheba-ukraine/', label: 'Sheba в Україні' },
  { slug: 'napriamy-likuvannia', href: '/napriamy-likuvannia/', label: 'Напрями лікування' },
  { slug: 'likari', href: '/likari/', label: 'Лікарі' },
  { slug: 'patsiientam', href: '/patsiientam/', label: 'Пацієнтам' },
  { slug: 'kontakty', href: '/kontakty/', label: 'Контакти' },
];

const NAV_EN = [
  { slug: 'home', href: '/en/', label: 'Home' },
  { slug: 'pro-medhub', href: '/en/about-medhub/', label: 'About MEDHUB' },
  { slug: 'sheba-medical-center', href: '/en/sheba-medical-center/', label: 'Sheba Medical Center' },
  { slug: 'napriamy-likuvannia', href: '/en/treatment-directions/', label: 'Treatment Directions' },
  { slug: 'likari', href: '/en/doctors/', label: 'Doctors' },
  { slug: 'patsiientam', href: '/en/patients/', label: 'Patients' },
  { slug: 'kontakty', href: '/en/contacts/', label: 'Contacts' },
];

// slug -> { uk, en } path, so the language switcher and hreflang tags can
// always find the counterpart page regardless of which language is active.
const PAGE_FAMILIES = {
  home: { uk: '/', en: '/en/' },
  'pro-medhub': { uk: '/pro-medhub/', en: '/en/about-medhub/' },
  'sheba-medical-center': { uk: '/sheba-medical-center/', en: '/en/sheba-medical-center/' },
  'napriamy-likuvannia': { uk: '/napriamy-likuvannia/', en: '/en/treatment-directions/' },
  likari: { uk: '/likari/', en: '/en/doctors/' },
  patsiientam: { uk: '/patsiientam/', en: '/en/patients/' },
  kontakty: { uk: '/kontakty/', en: '/en/contacts/' },
};

function navList(activeSlug, lang) {
  const nav = lang === 'en' ? NAV_EN : NAV;
  return nav.map((item) => {
    const current = item.slug === activeSlug;
    return `        <li${current ? ' class="is-current"' : ''}><a href="${item.href}"${current ? ' aria-current="page"' : ''}>${item.label}</a></li>`;
  }).join('\n');
}

function langSwitcher(activeSlug, lang) {
  const family = PAGE_FAMILIES[activeSlug];
  const ukHref = family ? family.uk : '/';
  const enHref = family ? family.en : '/en/';
  return `<div class="lang-switch">
        <a href="${ukHref}"${lang === 'uk' ? ' class="is-active" aria-current="true"' : ''}>UA</a>
        <a href="${enHref}"${lang === 'en' ? ' class="is-active" aria-current="true"' : ''}>EN</a>
      </div>`;
}

// ---------------------------------------------------------------------
// Header / footer / contact-form partials (JS template functions —
// the one place to edit chrome shared by every page).
// ---------------------------------------------------------------------

function renderHeader(activeSlug, lang = 'uk') {
  const en = lang === 'en';
  const home = en ? '/en/' : '/';
  const directions = en ? '/en/treatment-directions/' : '/napriamy-likuvannia/';
  const doctors = en ? '/en/doctors/' : '/likari/';
  const sheba = en ? '/en/sheba-medical-center/' : '/sheba-medical-center/';
  const contacts = en ? '/en/contacts/' : '/kontakty/';
  const repLine = en ? REP_LINE_EN : REP_LINE;
  const t = en
    ? {
        findDoctor: 'Sheba Doctors', directionsLabel: 'Treatment Directions', contactsLabel: 'Contacts',
        getConsult: 'Get a Consultation', openMenu: 'Open menu', mainNav: 'Main navigation', mobileNav: 'Mobile navigation',
        logoAria: 'MEDHUB — home', contactsAria: 'Contacts', directionsShortcut: 'Treatment Directions', doctorsShortcut: 'Sheba Doctors', shebaShortcut: 'Sheba Medical Center',
      }
    : {
        findDoctor: 'Лікарі Sheba', directionsLabel: 'Напрями лікування', contactsLabel: 'Контакти',
        getConsult: 'Отримати консультацію', openMenu: 'Відкрити меню', mainNav: 'Основна навігація', mobileNav: 'Мобільна навігація',
        logoAria: 'MEDHUB — на головну', contactsAria: 'Контакти', directionsShortcut: 'Напрями лікування', doctorsShortcut: 'Лікарі Sheba', shebaShortcut: 'Sheba Medical Center',
      };

  return `<header class="site-header" id="site-header">

  <div class="top-bar">
    <div class="top-bar-inner">
      <a href="${doctors}">${t.findDoctor}</a>
      <a href="${directions}">${t.directionsLabel}</a>
      <a href="${contacts}">${t.contactsLabel}</a>
      ${langSwitcher(activeSlug, lang)}
      <a href="${contacts}" class="top-bar-cta">${t.getConsult}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </div>
  </div>

  <div class="header-mid">
    <div class="container header-mid-inner">
      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="main-nav-mobile" aria-label="${t.openMenu}">
        <span></span><span></span><span></span>
      </button>

      <div class="brand-block">
        <div class="brand-lockup">
          <a href="${home}" class="logo logo--medhub" aria-label="${t.logoAria}">
            ${MEDHUB_MARK_SVG}
            <span class="logo-name">MEDHUB</span>
          </a>
          <span class="brand-divider" aria-hidden="true"></span>
          <a href="${sheba}" class="logo logo--sheba" aria-label="Sheba Medical Center">
            <img src="/assets/brand/sheba-medical-center-logo.svg" alt="Sheba Medical Center" class="sheba-logo-img">
          </a>
        </div>
        <p class="brand-tagline">${repLine}</p>
      </div>

      <a href="${contacts}" class="mobile-search-icon" aria-label="${t.contactsAria}">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </a>
    </div>
  </div>

  <nav class="main-nav" id="main-nav" aria-label="${t.mainNav}">
    <div class="container">
      <ul>
${navList(activeSlug, lang)}
      </ul>
    </div>
  </nav>

  <nav class="main-nav-mobile" id="main-nav-mobile" aria-label="${t.mobileNav}">
    <ul>
${navList(activeSlug, lang)}
    </ul>
    <div class="lang-switch lang-switch--mobile">
      <a href="${PAGE_FAMILIES[activeSlug] ? PAGE_FAMILIES[activeSlug].uk : '/'}"${lang === 'uk' ? ' class="is-active" aria-current="true"' : ''}>UA</a>
      <a href="${PAGE_FAMILIES[activeSlug] ? PAGE_FAMILIES[activeSlug].en : '/en/'}"${lang === 'en' ? ' class="is-active" aria-current="true"' : ''}>EN</a>
    </div>
  </nav>
</header>`;
}

function renderFooter(lang = 'uk') {
  const en = lang === 'en';
  const home = en ? '/en/' : '/';
  const proMedhub = en ? '/en/about-medhub/' : '/pro-medhub/';
  const sheba = en ? '/en/sheba-medical-center/' : '/sheba-medical-center/';
  const directions = en ? '/en/treatment-directions/' : '/napriamy-likuvannia/';
  const doctors = en ? '/en/doctors/' : '/likari/';
  const patients = en ? '/en/patients/' : '/patsiientam/';
  const contacts = en ? '/en/contacts/' : '/kontakty/';
  const repLine = en ? REP_LINE_EN : REP_LINE;
  const disclosure = en ? LEGAL_DISCLOSURE_EN : LEGAL_DISCLOSURE;

  const t = en
    ? {
        fbAria: 'Facebook MEDHUB', contactTitle: 'Contact MEDHUB in Ukraine',
        colMedhub: 'MEDHUB', aboutMedhub: 'About MEDHUB', shebaLink: 'Sheba Medical Center', directionsLink: 'Treatment Directions', doctorsLink: 'Sheba Doctors',
        colPatients: 'Patients', howToReach: 'How to Reach Us', sendDocs: 'Send Documents', faq: 'FAQ', contactsLink: 'Contacts',
        colContacts: 'MEDHUB Contacts', phoneLabel: 'Phone: +380 67 406 73 57 (Ukrainian language)', waLabel: 'WhatsApp: +380 67 406 73 57 (Ukrainian language)', emailLabel: 'Email: info@medhub.group',
        rights: 'All rights reserved.', privacy: 'Privacy Policy', terms: 'Terms of Use',
      }
    : {
        fbAria: 'Facebook MEDHUB', contactTitle: "Зв'яжіться з MEDHUB в Україні",
        colMedhub: 'MEDHUB', aboutMedhub: 'Про MEDHUB', shebaLink: 'Sheba Medical Center', directionsLink: 'Напрями лікування', doctorsLink: 'Лікарі Sheba',
        colPatients: 'Пацієнтам', howToReach: 'Як звернутися', sendDocs: 'Надіслати документи', faq: 'Часті запитання', contactsLink: 'Контакти',
        colContacts: 'Контакти MEDHUB', phoneLabel: 'Телефон: +380 67 406 73 57 (українська мова)', waLabel: 'WhatsApp: +380 67 406 73 57 (українська мова)', emailLabel: 'Email: info@medhub.group',
        rights: 'Усі права захищені.', privacy: 'Політика конфіденційності', terms: 'Умови використання',
      };

  return `<footer class="site-footer" id="contacts">
  <div class="container footer-top">
    <div class="brand-block">
      <div class="brand-lockup">
        <a href="${home}" class="logo logo--medhub" aria-label="${t.aboutMedhub}">
          ${MEDHUB_MARK_SVG}
          <span class="logo-name">MEDHUB</span>
        </a>
        <span class="brand-divider" aria-hidden="true"></span>
        <a href="${sheba}" class="logo logo--sheba" aria-label="Sheba Medical Center">
          <img src="/assets/brand/sheba-medical-center-logo.svg" alt="Sheba Medical Center" class="sheba-logo-img">
        </a>
      </div>
      <p class="brand-tagline">${repLine}</p>
    </div>

    <div class="footer-contact">
      <a class="footer-fb" href="#" aria-label="${t.fbAria}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 8.5h2V5.2c-.35-.05-1.55-.2-2.95-.2-2.92 0-4.92 1.83-4.92 5.2V13H6v3.7h3.13V24h3.7v-7.3h3l.5-3.7h-3.5V10.6c0-1.07.29-1.8 1.87-1.8z" fill="#fff"/></svg>
      </a>
      <a class="footer-phone" href="tel:+380674067357">+380 67 406 73 57</a>
      <span class="footer-contact-title">${t.contactTitle}</span>
    </div>
  </div>

  <div class="container footer-grid">
    <div class="footer-col">
      <h2>${t.colMedhub}</h2>
      <ul>
        <li><a href="${proMedhub}">${t.aboutMedhub}</a></li>
        <li><a href="${sheba}">${t.shebaLink}</a></li>
${en ? '' : `        <li><a href="/sheba-ukraine/">Sheba в Україні</a></li>
        <li><a href="/likuvannia-v-izraili/">Лікування в Ізраїлі</a></li>
`}        <li><a href="${directions}">${t.directionsLink}</a></li>
${en ? '' : '        <li><a href="/diagnostyka/">Діагностика</a></li>\n'}        <li><a href="${doctors}">${t.doctorsLink}</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h2>${t.colPatients}</h2>
      <ul>
        <li><a href="${patients}">${t.howToReach}</a></li>
        <li><a href="${contacts}#contact-form">${t.sendDocs}</a></li>
        <li><a href="${patients}#faq">${t.faq}</a></li>
        <li><a href="${contacts}">${t.contactsLink}</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h2>${t.colContacts}</h2>
      <ul>
        <li><a href="tel:+380674067357">${t.phoneLabel}</a></li>
        <li><a href="https://wa.me/380674067357">${t.waLabel}</a></li>
        <li><a href="mailto:info@medhub.group">${t.emailLabel}</a></li>
      </ul>
    </div>
  </div>

  <div class="container footer-disclosure">
    <p>${disclosure}</p>
  </div>

  <div class="footer-bottom">
    <div class="container footer-bottom-inner">
      <p>&copy; <span id="footer-year"></span> MEDHUB. ${t.rights}</p>
      <div class="footer-legal">
        <a href="#">${t.privacy}</a>
        <a href="#">${t.terms}</a>
      </div>
    </div>
  </div>
</footer>`;
}

function renderConsultationForm(lang = 'uk') {
  const en = lang === 'en';
  const t = en
    ? {
        fullName: 'Full name', phone: 'Phone', email: 'Email', country: 'Country',
        message: 'Brief description of your medical question', documents: 'Upload medical documents', fileHint: 'No file chosen',
        consent: 'I agree to the processing of personal data and medical information for the purpose of arranging a consultation.',
        submit: 'Send Request', thanks: "Thank you. Your request has been received by the MEDHUB team. Our coordinator will contact you.",
      }
    : {
        fullName: "Ім'я та прізвище", phone: 'Телефон', email: 'Email', country: 'Країна',
        message: 'Короткий опис медичного питання', documents: 'Завантажити медичні документи', fileHint: 'Файл не обрано',
        consent: 'Я погоджуюся на обробку персональних даних та медичної інформації з метою організації консультації.',
        submit: 'Надіслати запит', thanks: "Дякуємо. Ваш запит отримано командою MEDHUB. Наш координатор зв'яжеться з вами.",
      };

  return `      <form id="consultation-form" class="consultation-form" novalidate>
        <div class="form-row">
          <label for="full-name">${t.fullName}</label>
          <input type="text" id="full-name" name="full-name" autocomplete="name" required>
        </div>

        <div class="form-row form-row--split">
          <div>
            <label for="phone">${t.phone}</label>
            <input type="tel" id="phone" name="phone" autocomplete="tel" required>
          </div>
          <div>
            <label for="email">${t.email}</label>
            <input type="email" id="email" name="email" autocomplete="email" required>
          </div>
        </div>

        <div class="form-row">
          <label for="country">${t.country}</label>
          <input type="text" id="country" name="country" autocomplete="country-name" required>
        </div>

        <div class="form-row">
          <label for="message">${t.message}</label>
          <textarea id="message" name="message" rows="4"></textarea>
        </div>

        <div class="form-row">
          <label for="documents">${t.documents}</label>
          <input type="file" id="documents" name="documents" multiple>
          <p class="field-hint" id="file-hint">${t.fileHint}</p>
        </div>

        <div class="form-row form-row--checkbox">
          <input type="checkbox" id="consent" name="consent" required>
          <label for="consent">${t.consent}</label>
        </div>

        <button type="submit" class="btn btn-pink btn-plain form-submit">${t.submit}</button>

        <p class="form-status" id="form-status" role="status" aria-live="polite" hidden>
          ${t.thanks}
        </p>
      </form>`;
}

// ---------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------

function renderPage({ slug, navSlug, lang = 'uk', title, description, canonicalPath, mainHtml, schema }) {
  const canonical = SITE_URL + canonicalPath;
  const en = lang === 'en';
  const family = PAGE_FAMILIES[slug];
  const hreflangLinks = family
    ? `<link rel="alternate" hreflang="uk" href="${SITE_URL}${family.uk}">
<link rel="alternate" hreflang="en" href="${SITE_URL}${family.en}">
<link rel="alternate" hreflang="x-default" href="${SITE_URL}${family.uk}">`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
${hreflangLinks}

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${SITE_URL}/assets/brand/medhub-sheba-og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${en ? 'en_US' : 'uk_UA'}">

<!-- Favicon: MEDHUB mark (logo variant a2) -->
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/css/style.css">

${(Array.isArray(schema) ? schema : [schema]).map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
</head>
<body>
<a class="skip-link" href="#main-content">${en ? 'Skip to main content' : 'Перейти до основного вмісту'}</a>

${renderHeader(navSlug || slug, lang)}

<main id="main-content">
${mainHtml}
</main>

${renderFooter(lang)}

<script src="/js/main.js"></script>
</body>
</html>
`;
}

// Two separate legal/organizational entities — never merged into one
// schema.org record. MEDHUB is the site's own Organization; Sheba is
// referenced only as the (separate) medical organization MEDHUB
// represents, never given MEDHUB's own contact details.
const MEDHUB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  description: LEGAL_DISCLOSURE,
  telephone: '+380-67-406-73-57',
  email: 'info@medhub.group',
  areaServed: 'UA',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Голосіївський проспект, 70',
    addressLocality: 'Київ',
    addressCountry: 'UA',
  },
};

const SHEBA_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'MedicalOrganization',
  name: SHEBA_NAME,
  medicalSpecialty: ['Oncology', 'Cardiology', 'Neurology', 'Radiology'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Derech Sheba 2',
    addressLocality: 'Ramat Gan',
    addressCountry: 'IL',
  },
};

// Default for most pages: MEDHUB's own entity. Pages that also need to
// describe Sheba pass [MEDHUB_SCHEMA, SHEBA_SCHEMA] explicitly.
const ORG_SCHEMA_BASE = MEDHUB_SCHEMA;

// English-language variant for /en/ pages — same entity, description in
// English so the structured data matches the page's own language.
const MEDHUB_SCHEMA_EN = { ...MEDHUB_SCHEMA, description: LEGAL_DISCLOSURE_EN };

// ---------------------------------------------------------------------
// Reusable content fragments
// ---------------------------------------------------------------------

// Breadcrumb trail: pass [[name, href], ...] from Головна down to the
// current page (href required on every item, including the last, so the
// BreadcrumbList schema can carry a URL for each step). Returns both the
// visible nav markup and the matching JSON-LD object — pass .schema into
// the page's `schema` array and prepend .html to mainHtml.
function crumbs(items) {
  const html = `  <nav class="breadcrumbs" aria-label="Хлібні крихти">
    <div class="container">
      <ol>
${items.map(([name, href], i) => i === items.length - 1
    ? `        <li aria-current="page">${name}</li>`
    : `        <li><a href="${href}">${name}</a></li>`).join('\n')}
      </ol>
    </div>
  </nav>`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, href], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE_URL}${href}`,
    })),
  };
  return { html, schema };
}

function titleBand(h1) {
  return `  <div class="title-band" id="top">
    <div class="container">
      <h1>${h1}</h1>
    </div>
  </div>`;
}

function ctaBand({ heading, headingAccent, text, emphasis, primaryLabel, primaryHref, secondaryLabel, secondaryHref, image, imageAlt }) {
  return `  <section class="cta-band">
    <div class="cta-band-inner">
      <div class="cta-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="${image}" alt="${imageAlt}" loading="lazy" width="663" height="600">
      </div>
      <div class="cta-content">
        <h2><strong>${heading}</strong> <em>${headingAccent}</em></h2>
        <p>${text}</p>
        ${emphasis ? `<p class="emphasis">${emphasis}</p>` : ''}
        <div class="cta-actions">
          <a href="${primaryHref}" class="btn btn-pink">${primaryLabel}
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
          <a href="${secondaryHref}" class="btn btn-white">${secondaryLabel}
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#0000C1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>
      </div>
    </div>
  </section>`;
}

// ---------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------

const pages = [];

// ===== 1. HOME =========================================================
pages.push({
  slug: 'home',
  outPath: 'index.html',
  title: 'MEDHUB | Авторизований представник Sheba Medical Center в Україні',
  description: 'MEDHUB — авторизований представник Sheba Medical Center в Україні. Організація консультацій, діагностики та лікування українських пацієнтів у Sheba Medical Center, Ізраїль.',
  canonicalPath: '/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA],
  mainHtml: `  <section class="hero hero--home">
    <div class="container hero-inner">
      <div class="hero-text">
        <p class="eyebrow">MEDHUB — ${REP_LINE}</p>
        <h1>Лікування в Sheba Medical Center</h1>
        <p>Допомагаємо пацієнтам з України отримати консультацію, пройти діагностику та організувати лікування в Sheba Medical Center, Ізраїль.</p>
        <p>MEDHUB координує звернення пацієнта — від передачі медичних документів до організації візиту та супроводу.</p>
        <div class="hero-actions">
          <a href="/kontakty/" class="btn btn-pink">Отримати консультацію
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
          <a href="/kontakty/#contact-form" class="btn btn-outline">Надіслати медичні документи
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2315FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/hero-staff.jpg" alt="Sheba Medical Center — персонал і пацієнти" loading="lazy" width="760" height="310">
      </div>
    </div>
  </section>

  <section class="section" id="about-medhub">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <h2>Представництво Sheba Medical Center в Україні</h2>
        <p class="section-lead">MEDHUB є авторизованим представником Sheba Medical Center в Україні та координує звернення українських пацієнтів до одного з провідних медичних центрів Ізраїлю.</p>
        <div class="advantage-item">
          <h3><strong>Передача</strong> медичних документів</h3>
          <p>Приймаємо виписки, знімки та результати досліджень і готуємо їх до передачі профільному спеціалісту.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Координація</strong> консультацій</h3>
          <p>Первинно опрацьовуємо звернення та визначаємо, до якого напряму Sheba Medical Center він відноситься.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Організація програми</strong> діагностики та лікування</h3>
          <p>Передаємо медичну інформацію фахівцям Sheba та допомагаємо з програмою обстеження.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Супровід</strong> пацієнта</h3>
          <p>Координуємо дати, підтримуємо зв'язок із пацієнтом і допомагаємо з підготовкою до візиту в Ізраїль.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Sheba Medical Center — корпус" loading="lazy" width="535" height="420">
      </div>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <img src="/assets/brand/sheba-medical-center-logo.svg" alt="Sheba Medical Center" class="sheba-logo-block">
      <h2>Sheba Medical Center</h2>
      <div class="support-body">
        <p>Sheba Medical Center — один із провідних багатопрофільних медичних центрів Ізраїлю та Близького Сходу, з десятками клінічних відділень, дослідницькими центрами та реабілітаційною клінікою в межах одного кампусу. Саме тут MEDHUB організовує консультації, діагностику та лікування для українських пацієнтів.</p>
      </div>
      <a href="/sheba-medical-center/" class="text-link">Дізнатися більше про Sheba →</a>
    </div>
  </section>

  <section class="section" id="sheba-ukraine-links">
    <div class="container advantages-inner">
      <div class="advantage-item">
        <h3><strong>Представник</strong> Sheba в Україні</h3>
        <p>MEDHUB — авторизований представник Sheba Medical Center в Україні. Дізнайтеся, як звернутися до Sheba з України.</p>
        <a href="/sheba-ukraine/" class="text-link">Представництво Sheba в Україні →</a>
      </div>
      <div class="advantage-item">
        <h3><strong>Лікування</strong> в Ізраїлі</h3>
        <p>Як організовано звернення, діагностику й лікування в Sheba Medical Center для пацієнтів з України.</p>
        <a href="/likuvannia-v-izraili/" class="text-link">Лікування в Ізраїлі →</a>
      </div>
    </div>
  </section>

  <section class="section" id="directions">
    <div class="container">
      <h2><strong>Напрями</strong> лікування</h2>
      <p class="section-lead">Лікування проводиться в Sheba Medical Center. MEDHUB організовує звернення за будь-яким із напрямів центру.</p>
      <div class="directions-grid directions-grid--compact">
        <div class="direction-card"><h3>Онкологія</h3><p>Діагностика та лікування онкологічних захворювань у дорослих і дітей.</p></div>
        <div class="direction-card"><h3>Кардіологія</h3><p>Діагностика та лікування захворювань серця і судин.</p></div>
        <div class="direction-card"><h3>Неврологія</h3><p>Діагностика та лікування захворювань нервової системи.</p></div>
        <div class="direction-card"><h3>Ортопедія</h3><p>Лікування захворювань і травм опорно-рухового апарату.</p></div>
        <div class="direction-card"><h3>Онкогематологія</h3><p>Діагностика та лікування онкологічних захворювань крові й кровотворної системи.</p></div>
        <div class="direction-card"><h3>Трансплантологія</h3><p>Програми трансплантації органів і кісткового мозку.</p></div>
      </div>
      <a href="/napriamy-likuvannia/" class="text-link">Переглянути всі напрями лікування →</a>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <h2>Як це працює</h2>
      <ol class="steps-list">
        <li><span class="steps-number">1</span><div><h3>Надішліть документи</h3><p>Виписки, знімки та результати досліджень — координатору MEDHUB.</p></div></li>
        <li><span class="steps-number">2</span><div><h3>Координація запиту</h3><p>MEDHUB опрацьовує звернення та визначає профільний напрям.</p></div></li>
        <li><span class="steps-number">3</span><div><h3>Медична оцінка</h3><p>Документи передаються фахівцям Sheba Medical Center.</p></div></li>
        <li><span class="steps-number">4</span><div><h3>Програма консультації або лікування</h3><p>Sheba формує попередню програму діагностики чи лікування.</p></div></li>
        <li><span class="steps-number">5</span><div><h3>Організація візиту</h3><p>MEDHUB координує дати, лікарів і необхідні обстеження.</p></div></li>
        <li><span class="steps-number">6</span><div><h3>Супровід</h3><p>MEDHUB залишається на зв'язку протягом усього процесу.</p></div></li>
      </ol>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна консультація',
  headingAccent: 'щодо лікування в Sheba?',
  text: 'Зверніться до MEDHUB в Україні — координатор допоможе визначити наступні кроки.',
  emphasis: '',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Напрями лікування',
  secondaryHref: '/napriamy-likuvannia/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== 2. ПРО MEDHUB ====================================================
const BC_PRO_MEDHUB = crumbs([['Головна', '/'], ['Про MEDHUB', '/pro-medhub/']]);
pages.push({
  slug: 'pro-medhub',
  outPath: 'pro-medhub/index.html',
  title: 'Про MEDHUB | Авторизований представник Sheba Medical Center в Україні',
  description: 'MEDHUB — авторизований представник Sheba Medical Center в Україні: координація звернень, супровід пацієнтів і комунікація з медичним центром в Ізраїлі.',
  canonicalPath: '/pro-medhub/',
  schema: [MEDHUB_SCHEMA, BC_PRO_MEDHUB.schema],
  mainHtml: `${BC_PRO_MEDHUB.html}${titleBand('Про MEDHUB')}

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <h2><strong>MEDHUB — представництво</strong> Sheba Medical Center в Україні</h2>
        <p>MEDHUB є авторизованим представником Sheba Medical Center в Україні. Ми не проводимо лікування самостійно — наша роль полягає в організації та координації звернення українського пацієнта до Sheba Medical Center.</p>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed office/team photo -->
        <img src="/assets/temp-dev-refs/cta-consultation.jpg" alt="Координатор MEDHUB на консультації" loading="lazy" width="760" height="310" style="aspect-ratio:760/310;">
      </div>
    </div>
  </section>

  <section class="section" id="role">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <div class="advantage-item">
          <h3><strong>Представник,</strong> а не клініка</h3>
          <p>MEDHUB — організаційна представницька структура. Медичні консультації, діагностику та лікування проводить виключно Sheba Medical Center та її фахівці.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Координація</strong> звернення</h3>
          <p>Приймаємо звернення пацієнта, опрацьовуємо медичні документи та передаємо їх профільному підрозділу Sheba.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Комунікація</strong> з медичним центром</h3>
          <p>Підтримуємо зв'язок між пацієнтом і Sheba Medical Center протягом усього процесу — від першого запиту до завершення лікування.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Супровід</strong> до поїздки</h3>
          <p>Допомагаємо пацієнту підготуватися до візиту в Ізраїль: узгодження дат, організаційні питання, переклад документів.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed office/team photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Sheba Medical Center — медичний партнер MEDHUB" loading="lazy" width="535" height="420">
      </div>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2><strong>Співпраця</strong> зі Sheba Medical Center</h2>
      <div class="support-body">
        <p>MEDHUB співпрацює безпосередньо зі Sheba Medical Center в Ізраїлі. Кожне звернення, яке проходить через MEDHUB, координується з профільним підрозділом центру — від первинної медичної оцінки до формування програми діагностики або лікування.</p>
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Готові звернутися',
  headingAccent: 'до MEDHUB?',
  text: "Надішліть медичні документи — координатор MEDHUB зв'яжеться з вами.",
  emphasis: '',
  primaryLabel: "Зв'язатися з MEDHUB",
  primaryHref: '/kontakty/',
  secondaryLabel: 'Sheba Medical Center',
  secondaryHref: '/sheba-medical-center/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== 3. SHEBA MEDICAL CENTER ==========================================
const BC_SHEBA = crumbs([['Головна', '/'], ['Sheba Medical Center', '/sheba-medical-center/']]);
pages.push({
  slug: 'sheba-medical-center',
  outPath: 'sheba-medical-center/index.html',
  title: 'Sheba Medical Center | MEDHUB — представник в Україні',
  description: 'Sheba Medical Center — один із провідних медичних центрів Ізраїлю: клінічні напрями, діагностика, лікування, дослідження. MEDHUB організовує звернення українських пацієнтів.',
  canonicalPath: '/sheba-medical-center/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA, BC_SHEBA.schema],
  mainHtml: `${BC_SHEBA.html}${titleBand('Sheba Medical Center')}

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <p class="eyebrow">MEDHUB представляє Sheba в Україні → Sheba проводить медичне лікування в Ізраїлі</p>
        <h2><strong>Один із найбільших медичних центрів</strong> Близького Сходу</h2>
        <p>Sheba Medical Center розташований у Рамат-Гані, поруч із Тель-Авівом, і об'єднує десятки клінічних відділень, дослідницькі центри та реабілітаційну клініку в межах одного кампусу.</p>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Кампус Sheba Medical Center" loading="lazy" width="535" height="420" style="aspect-ratio:760/310;object-position:center;">
      </div>
    </div>
  </section>

  <section class="section support-section">
    <div class="container">
      <h2><strong>Історія</strong> медичного центру</h2>
      <div class="support-body">
        <p>Sheba Medical Center засновано у 1948 році як військовий шпиталь; згодом центр виріс у один із найбільших багатопрофільних медичних комплексів регіону. Сьогодні це академічна лікарня, пов'язана з провідним медичним факультетом, де поєднуються клінічна практика, викладання та наукові дослідження.</p>
      </div>
    </div>
  </section>

  <section class="section" id="about">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <div class="advantage-item">
          <h3><strong>Масштаб</strong> центру</h3>
          <p>Десятки відділень і клінічних центрів у межах одного кампусу — від онкології до реабілітації.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Діагностика</strong> та технології</h3>
          <p>Сучасне обладнання та актуальні протоколи діагностики й лікування в кардіології, онкології, неврології та інших напрямах.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Дослідження</strong> та інновації</h3>
          <p>Sheba бере участь у клінічних дослідженнях і впроваджує нові методи діагностики та лікування.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Спеціалісти</strong> та академічна база</h3>
          <p>Лікарі центру поєднують клінічну практику з викладанням і науковою роботою на медичному факультеті.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Міжнародні</strong> пацієнти</h3>
          <p>Sheba приймає пацієнтів з інших країн; в Україні звернення координує MEDHUB.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/hero-staff.jpg" alt="Персонал Sheba Medical Center" loading="lazy" width="760" height="310">
      </div>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2><strong>Клінічні</strong> напрями</h2>
      <div class="support-body">
        <p>Онкологія, онкогематологія, кардіологія, неврологія, ортопедія, педіатрія, реабілітація, трансплантологія та інші напрями — детальний перелік і короткий опис кожного напряму зібрано на окремій сторінці.</p>
      </div>
      <a href="/napriamy-likuvannia/" class="text-link">Переглянути напрями лікування →</a>
    </div>
  </section>

  <section class="section support-section">
    <div class="container">
      <h2>Організація лікування та діагностики</h2>
      <div class="support-body">
        <p>MEDHUB координує весь процес — від первинного звернення до організації візиту в Sheba Medical Center, включно з попередньою діагностикою.</p>
      </div>
      <p><a href="/likuvannia-v-izraili/" class="text-link">Як організовано лікування в Ізраїлі →</a></p>
      <p><a href="/diagnostyka/" class="text-link">Діагностика в Sheba Medical Center →</a></p>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2>Представництво в Україні</h2>
      <div class="support-body">
        <p>MEDHUB — авторизований представник Sheba Medical Center в Україні. Українські пацієнти звертаються до Sheba саме через MEDHUB.</p>
      </div>
      <a href="/sheba-ukraine/" class="text-link">Як звернутися до Sheba з України →</a>
    </div>
  </section>

  <section class="section support-section">
    <div class="container">
      <h2>Sheba та Україна — довша історія</h2>
      <div class="support-body">
        <p>Зв'язок Sheba Medical Center з Україною почався не з відкриття цього сайту. Ще у 2022 році центр розгорнув польовий госпіталь Kochav Meir у Мостиськах, а згодом — мобільну клініку жіночого здоров'я та постійний діагностичний центр у Києві.</p>
      </div>
      <a href="/sheba-ukraine-dopomoha/" class="text-link">Дізнатися більше про допомогу Sheba Україні з 2022 року →</a>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна консультація',
  headingAccent: 'щодо лікування в Sheba?',
  text: 'Зверніться до MEDHUB в Україні — координатор допоможе визначити наступні кроки.',
  emphasis: '',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Лікарі Sheba',
  secondaryHref: '/likari/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== SHEBA В УКРАЇНІ (representation / how to reach Sheba from Ukraine) =
// Distinct search intent from /pro-medhub/ (about MEDHUB as a company) and
// from /sheba-ukraine-dopomoha/ (2022– humanitarian aid history) — this
// page answers "how does a Ukrainian patient reach Sheba / who represents
// Sheba in Ukraine." Do not merge this content into either of those pages.
const BC_SHEBA_UA = crumbs([['Головна', '/'], ['Sheba в Україні', '/sheba-ukraine/']]);
pages.push({
  slug: 'sheba-ukraine',
  outPath: 'sheba-ukraine/index.html',
  title: 'Представник Sheba Medical Center в Україні | MEDHUB',
  description: 'MEDHUB — офіційний представник Sheba Medical Center в Україні. Як звернутися до Sheba Medical Center з України та зв\'язатися з координатором MEDHUB.',
  canonicalPath: '/sheba-ukraine/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA, BC_SHEBA_UA.schema],
  mainHtml: `${BC_SHEBA_UA.html}${titleBand('Представник Sheba Medical Center в Україні')}

  <section class="section page-intro">
    <div class="container">
      <p>MEDHUB є авторизованим представником Sheba Medical Center в Україні. Це означає, що українські пацієнти звертаються до Sheba Medical Center не напряму, а через офіс MEDHUB у Києві — українською або російською мовою, без потреби самостійно шукати контакти в Ізраїлі чи долати мовний бар'єр.</p>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2><strong>Що робить</strong> представництво в Україні</h2>
      <div class="support-body">
        <p>MEDHUB приймає звернення та медичні документи від українського пацієнта, передає їх профільному підрозділу Sheba Medical Center і координує відповідь — від первинної медичної оцінки до організації візиту в Ізраїль. Медичні рішення ухвалює виключно Sheba Medical Center.</p>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="contact-info-grid">
        <div class="contact-info-item">
          <h3>Телефон і WhatsApp (українська мова)</h3>
          <p><a href="tel:+380674067357">+380 67 406 73 57</a></p>
        </div>
        <div class="contact-info-item">
          <h3>Email</h3>
          <p><a href="mailto:info@medhub.group">info@medhub.group</a></p>
        </div>
        <div class="contact-info-item">
          <h3>Офіс представництва</h3>
          <p>Голосіївський проспект, 70, офісна будівля готелю «Мир», Київ</p>
        </div>
      </div>
      <p><a href="/kontakty/" class="text-link">Усі контакти та форма звернення →</a></p>
    </div>
  </section>

  <section class="section support-section">
    <div class="container">
      <h2>Пов'язані сторінки</h2>
      <div class="support-body">
        <p><a href="/sheba-medical-center/" class="text-link">Про сам Sheba Medical Center →</a></p>
        <p><a href="/likuvannia-v-izraili/" class="text-link">Як організовано лікування в Ізраїлі →</a></p>
        <p><a href="/sheba-ukraine-dopomoha/" class="text-link">Допомога Sheba Medical Center Україні з 2022 року →</a></p>
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Готові',
  headingAccent: 'звернутися до Sheba через MEDHUB?',
  text: "Надішліть медичні документи — координатор MEDHUB зв'яжеться з вами.",
  emphasis: '',
  primaryLabel: "Зв'язатися з MEDHUB",
  primaryHref: '/kontakty/',
  secondaryLabel: 'Sheba Medical Center',
  secondaryHref: '/sheba-medical-center/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== 3. НАПРЯМИ ЛІКУВАННЯ (catalog + one stub page per direction) =====
const DIRECTIONS = [
  ['Онкологія', 'Діагностика та лікування онкологічних захворювань у дорослих і дітей, включно з хіміотерапією, променевою терапією та таргетною терапією.', 'onkologiya'],
  ['Онкогематологія', 'Діагностика та лікування онкологічних захворювань крові та кровотворної системи — лейкемії, лімфоми та мієломи.', 'onkohematologiya'],
  ['Кардіологія', 'Діагностика та лікування захворювань серця і судин, включно з інвазивною кардіологією та кардіохірургією.', 'kardiologiya'],
  ['Нейрохірургія', 'Хірургічне лікування захворювань і травм головного та спинного мозку.', 'neirohirurgiya'],
  ['Неврологія', 'Діагностика та лікування захворювань головного і спинного мозку, периферичної нервової системи.', 'nevrologiya'],
  ['Ортопедія', 'Лікування захворювань і травм опорно-рухового апарату, ендопротезування суглобів.', 'ortopediya'],
  ['Урологія', 'Діагностика та лікування захворювань сечостатевої системи.', 'urologiya'],
  ['Гінекологія', 'Діагностика та лікування гінекологічних захворювань, включно з онкогінекологією.', 'ginekologiya'],
  ['Гастроентерологія', 'Діагностика та лікування захворювань травної системи — стравоходу, шлунка, кишечника, печінки та підшлункової залози.', 'gastroenterologiya'],
  ['Педіатрія', 'Діагностика та лікування дитячих захворювань, включно з дитячою онкологією та хірургією.', 'pediatriya'],
  ['Реабілітація', 'Реабілітаційні програми після інсульту, травм і хірургічних втручань.', 'reabilitatsiya'],
  ['Трансплантологія', 'Програми трансплантації органів і кісткового мозку.', 'transplantologiya'],
];

const BC_NAPRIAMY = crumbs([['Головна', '/'], ['Напрями лікування', '/napriamy-likuvannia/']]);
pages.push({
  slug: 'napriamy-likuvannia',
  outPath: 'napriamy-likuvannia/index.html',
  title: 'Напрями лікування в Sheba Medical Center | MEDHUB',
  description: 'Напрями лікування в Sheba Medical Center: онкологія, онкогематологія, кардіологія, неврологія, ортопедія, гастроентерологія, педіатрія, реабілітація, трансплантологія та інші. MEDHUB організовує звернення українських пацієнтів.',
  canonicalPath: '/napriamy-likuvannia/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA, BC_NAPRIAMY.schema],
  mainHtml: `${BC_NAPRIAMY.html}${titleBand('Напрями лікування')}

  <section class="section page-intro">
    <div class="container">
      <p>Лікування за всіма напрямами нижче проводиться в Sheba Medical Center. MEDHUB, як представник центру в Україні, координує звернення пацієнта та передає медичні документи профільному підрозділу. Кожен напрям має власну сторінку — детальний опис буде доповнено найближчим часом.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="directions-grid">
${DIRECTIONS.map(([name, desc, slug]) => `        <a class="direction-card" href="/napriamy-likuvannia/${slug}/">
          <h3>${name} в Sheba Medical Center</h3>
          <p>${desc}</p>
        </a>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Не знайшли',
  headingAccent: 'потрібний напрям?',
  text: 'Опишіть медичне питання координатору MEDHUB — ми підкажемо, до якого відділення Sheba звернутися.',
  emphasis: '',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Лікарі Sheba',
  secondaryHref: '/likari/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// One thin stub page per direction — real routing/breadcrumbs/metadata now,
// full articles come in a later stage (do not expand these into long-form
// content here; see the project brief for the staged content plan).
for (const [name, desc, slug] of DIRECTIONS) {
  const bcDirection = crumbs([
    ['Головна', '/'],
    ['Напрями лікування', '/napriamy-likuvannia/'],
    [name, `/napriamy-likuvannia/${slug}/`],
  ]);
  pages.push({
    slug: `napriamy-likuvannia--${slug}`,
    navSlug: 'napriamy-likuvannia',
    outPath: `napriamy-likuvannia/${slug}/index.html`,
    title: `${name} в Sheba Medical Center | MEDHUB`,
    description: `${desc} MEDHUB координує звернення українських пацієнтів до Sheba Medical Center за напрямом «${name.toLowerCase()}».`,
    canonicalPath: `/napriamy-likuvannia/${slug}/`,
    schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA, bcDirection.schema],
    mainHtml: `${bcDirection.html}${titleBand(`${name} в Sheba Medical Center`)}

  <section class="section page-intro">
    <div class="container">
      <p>${desc}</p>
      <p class="info-note">Детальний опис цього напряму готується. Щоб дізнатися про можливості діагностики й лікування вже зараз, зверніться до координатора MEDHUB.</p>
    </div>
  </section>

${ctaBand({
    heading: 'Потрібна консультація',
    headingAccent: `щодо напряму «${name.toLowerCase()}»?`,
    text: 'Надішліть медичні документи — координатор MEDHUB передасть їх профільному підрозділу Sheba Medical Center.',
    emphasis: '',
    primaryLabel: 'Отримати консультацію',
    primaryHref: '/kontakty/',
    secondaryLabel: 'Усі напрями лікування',
    secondaryHref: '/napriamy-likuvannia/',
    image: '/assets/temp-dev-refs/cta-consultation.jpg',
    imageAlt: 'Консультація лікаря з пацієнтом',
  })}
`,
  });
}

// ===== ЛІКУВАННЯ В ІЗРАЇЛІ (process hub — distinct from /patsiientam/'s ==
// step-by-step guide and from /napriamy-likuvannia/'s specialty catalog;
// this page is the broad entry point for the "лікування в Ізраїлі" intent
// and links out to those pages instead of repeating their content).
const BC_LIKUVANNIA = crumbs([['Головна', '/'], ['Лікування в Ізраїлі', '/likuvannia-v-izraili/']]);
pages.push({
  slug: 'likuvannia-v-izraili',
  outPath: 'likuvannia-v-izraili/index.html',
  title: 'Лікування в Ізраїлі для українців | MEDHUB',
  description: 'Лікування в Ізраїлі для українських пацієнтів у Sheba Medical Center: напрями лікування, діагностика та організація візиту. Координує MEDHUB — представник Sheba в Україні.',
  canonicalPath: '/likuvannia-v-izraili/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA, BC_LIKUVANNIA.schema],
  mainHtml: `${BC_LIKUVANNIA.html}${titleBand('Лікування в Ізраїлі для пацієнтів з України')}

  <section class="section page-intro">
    <div class="container">
      <p>Лікування в Ізраїлі — це звернення до конкретного медичного центру, а не абстрактна послуга. MEDHUB організовує звернення українських пацієнтів саме до Sheba Medical Center: від первинної медичної оцінки документів до діагностики й лікування у профільному відділенні. Цей процес іноді називають «медичним туризмом», але по суті це організоване медичне звернення до Sheba Medical Center.</p>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2><strong>Медичний центр,</strong> де проходить лікування</h2>
      <div class="support-body">
        <p>Лікування відбувається в Sheba Medical Center — одному з найбільших багатопрофільних медичних центрів Ізраїлю, поблизу Тель-Авіва.</p>
      </div>
      <a href="/sheba-medical-center/" class="text-link">Про Sheba Medical Center →</a>
    </div>
  </section>

  <section class="section support-section">
    <div class="container">
      <h2><strong>Напрями</strong> лікування</h2>
      <div class="support-body">
        <p>Онкологія, кардіологія, неврологія, ортопедія, педіатрія та інші напрями — Sheba Medical Center приймає пацієнтів за широким спектром клінічних профілів.</p>
      </div>
      <a href="/napriamy-likuvannia/" class="text-link">Переглянути напрями лікування →</a>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2><strong>Діагностика</strong> перед лікуванням</h2>
      <div class="support-body">
        <p>Перед формуванням програми лікування Sheba Medical Center, як правило, проводить власну діагностику — щоб програма спиралася на актуальні дані, а не лише на документи, привезені з України.</p>
      </div>
      <a href="/diagnostyka/" class="text-link">Діагностика в Sheba Medical Center →</a>
    </div>
  </section>

  <section class="section support-section">
    <div class="container">
      <h2><strong>Як</strong> відбувається звернення</h2>
      <div class="support-body">
        <p>Покроковий процес — від першого звернення до MEDHUB і до перебування в Ізраїлі — описано на окремій сторінці для пацієнтів.</p>
      </div>
      <a href="/patsiientam/" class="text-link">Як звернутися: покроковий процес →</a>
    </div>
  </section>

${ctaBand({
  heading: 'Готові організувати',
  headingAccent: 'лікування в Ізраїлі?',
  text: 'Надішліть медичні документи — координатор MEDHUB передасть їх Sheba Medical Center.',
  emphasis: '',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Напрями лікування',
  secondaryHref: '/napriamy-likuvannia/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== ДІАГНОСТИКА (hub — sub-pages like /diagnostyka/pet-ct/ come later; ==
// listed here descriptively, not yet as links, so nothing points to a
// URL that doesn't exist yet).
const BC_DIAGNOSTYKA = crumbs([['Головна', '/'], ['Діагностика', '/diagnostyka/']]);
pages.push({
  slug: 'diagnostyka',
  outPath: 'diagnostyka/index.html',
  title: 'Діагностика в Ізраїлі | MEDHUB',
  description: 'Діагностика в Sheba Medical Center для українських пацієнтів: ПЕТ-КТ, МРТ, чек-ап, другий медичний висновок. MEDHUB координує звернення українських пацієнтів.',
  canonicalPath: '/diagnostyka/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA, BC_DIAGNOSTYKA.schema],
  mainHtml: `${BC_DIAGNOSTYKA.html}${titleBand('Діагностика в Sheba Medical Center')}

  <section class="section page-intro">
    <div class="container">
      <p>Sheba Medical Center проводить власну діагностику перед формуванням програми лікування, а також для пацієнтів, яким потрібен другий медичний висновок. MEDHUB координує передачу направлення та результатів між пацієнтом і профільним підрозділом Sheba.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="directions-grid">
        <!-- future page: /diagnostyka/pet-ct/ -->
        <div class="direction-card">
          <h3>ПЕТ-КТ</h3>
          <p>Позитронно-емісійна томографія, суміщена з комп'ютерною томографією — переважно в онкологічній діагностиці.</p>
        </div>
        <!-- future page: /diagnostyka/mri/ -->
        <div class="direction-card">
          <h3>МРТ</h3>
          <p>Магнітно-резонансна томографія для діагностики широкого кола захворювань.</p>
        </div>
        <!-- future page: /diagnostyka/check-up/ -->
        <div class="direction-card">
          <h3>Чек-ап</h3>
          <p>Комплексне медичне обстеження для загальної оцінки стану здоров'я.</p>
        </div>
        <!-- future page: /diagnostyka/drugyi-medychnyi-vysnovok/ -->
        <div class="direction-card">
          <h3>Другий медичний висновок</h3>
          <p>Повторна оцінка наявного діагнозу чи програми лікування фахівцями Sheba Medical Center.</p>
        </div>
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна',
  headingAccent: 'діагностика в Sheba?',
  text: 'Надішліть наявні медичні документи — координатор MEDHUB уточнить, яке обстеження потрібне.',
  emphasis: '',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Лікування в Ізраїлі',
  secondaryHref: '/likuvannia-v-izraili/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== 4. КОМАНДА SHEBA (real International Patient Department staff) ===
// Source: https://www.shebaonline.ru/nashi-sotrudniki/ — names, titles and
// languages are as published there. These are medical coordinators/curators/
// consultants of Sheba's International Patient Department, not attending
// physicians — do not relabel them with clinical specialties they don't hold.
const DOCTORS = [
  ['/assets/team/mika-amram.jpg', 'Міка Амрам', 'Директорка департаменту міжнародних пацієнтів', 'іврит, англійська'],
  ['/assets/team/vered-cohen.jpg', 'Веред Коен Хершафт', 'Керівниця департаменту глобальних медичних послуг', ''],
  ['/assets/team/yelena-kolesnik.jpg', 'Олена Колесник', 'Старша медична координаторка', 'іврит, російська, англійська'],
  ['/assets/team/olya-mayzeleva.jpg', 'Ольга Майзелева', 'Керівниця відділу медичного консультування', 'іврит, російська'],
  ['/assets/team/olesya-chernihovski.jpg', 'Олеся Черниховська', 'Керівниця напряму ШІ, інновацій та клінічної інтеграції', 'іврит, російська, англійська'],
  ['/assets/team/amir-roitman.jpg', 'Амір Ройтман', 'Медичний консультант', 'іврит, англійська, російська'],
  ['/assets/team/hannah-or.jpg', 'Ханна Ор', 'Медична консультантка', 'іврит, англійська'],
  ['/assets/team/nikita-zubenko.jpg', 'Нікіта Зубенко', 'Медичний консультант', 'іврит, російська, англійська'],
  ['/assets/team/bogdan-medovar.jpg', 'Богдан Медовар', 'Медичний куратор', 'іврит, російська, англійська, українська'],
  ['/assets/team/vera-gerova.jpg', 'Віра Герова', 'Медична координаторка у сфері гінекології, онкогінекології та ЕКЗ', 'іврит, російська'],
  ['/assets/team/victoria-zen.jpg', 'Вікторія Зен', 'Медична координаторка у сфері гематоонкології', 'іврит, російська, англійська'],
  ['/assets/team/galit-goman.jpg', 'Галіт Гоман', 'Медична координаторка', 'іврит, російська, англійська'],
  ['/assets/team/rimma-pustovoitovska.jpg', 'Рімма Пустовойтовська', 'Медична координаторка у сфері дитячої онкології', 'іврит, російська, англійська'],
  ['/assets/team/milana-tilyuk.jpg', 'Мілана Тілюк', 'Медична координаторка у сфері педіатрії та дитячої гематоонкології', 'іврит, російська'],
];

const BC_LIKARI = crumbs([['Головна', '/'], ['Команда Sheba', '/likari/']]);
pages.push({
  slug: 'likari',
  outPath: 'likari/index.html',
  title: 'Команда Sheba Medical Center | MEDHUB',
  description: 'Медичні консультанти та координатори департаменту міжнародних пацієнтів Sheba Medical Center. MEDHUB координує звернення українських пацієнтів до цієї команди.',
  canonicalPath: '/likari/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA, BC_LIKARI.schema],
  mainHtml: `${BC_LIKARI.html}${titleBand('Команда Sheba Medical Center')}

  <section class="section page-intro">
    <div class="container">
      <p>Департамент міжнародних пацієнтів Sheba Medical Center супроводжує звернення іноземних пацієнтів — від першого запиту до організації лікування. MEDHUB координує звернення українських пацієнтів саме до цієї команди.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="doctor-grid">
${DOCTORS.map(([photo, name, title, langs]) => `        <div class="doctor-card">
          <img class="doctor-avatar" src="${photo}" alt="${name}" width="88" height="88" loading="lazy">
          <h3>${name}</h3>
          <span class="doctor-specialty">${title}</span>
          <span class="doctor-dept">Sheba Medical Center — департамент міжнародних пацієнтів</span>
          ${langs ? `<p class="doctor-desc">Мови спілкування: ${langs}.</p>` : ''}
          <a href="/kontakty/" class="btn btn-outline btn-sm">Звернутися через MEDHUB
            <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2315FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна допомога',
  headingAccent: 'з організацією лікування?',
  text: 'Надішліть медичні документи — MEDHUB передасть звернення команді департаменту міжнародних пацієнтів Sheba Medical Center.',
  emphasis: '',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Напрями лікування',
  secondaryHref: '/napriamy-likuvannia/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== 5. ПАЦІЄНТАМ (guide + FAQ) =======================================
const FAQ = [
  ['Скільки коштує консультація?', 'Вартість діагностики та лікування визначає Sheba Medical Center індивідуально, залежно від медичного випадку. MEDHUB не встановлює медичні тарифи — координатор передає запит на розрахунок вартості разом із програмою обстеження.'],
  ['Якою мовою відбувається спілкування?', 'Звернення до MEDHUB — українською або російською мовою. Комунікацію з фахівцями Sheba Medical Center координує MEDHUB, за потреби залучаючи переклад.'],
  ['Чи можна надіслати документи, які вже перекладені іншою мовою?', 'Так. Якщо документи ще не перекладені, MEDHUB допоможе організувати переклад перед передачею фахівцям Sheba.'],
  ['Хто приймає рішення про програму лікування?', 'Медичну оцінку та програму діагностики чи лікування визначають виключно лікарі Sheba Medical Center. MEDHUB координує процес, але не приймає медичних рішень.'],
];

const BC_PATSIIENTAM = crumbs([['Головна', '/'], ['Пацієнтам', '/patsiientam/']]);
pages.push({
  slug: 'patsiientam',
  outPath: 'patsiientam/index.html',
  title: 'Пацієнтам | MEDHUB — представник Sheba Medical Center в Україні',
  description: 'Як звернутися до MEDHUB, які документи потрібні, як відбувається медична оцінка, підготовка до візиту в Sheba Medical Center та відповіді на часті запитання.',
  canonicalPath: '/patsiientam/',
  schema: [MEDHUB_SCHEMA, BC_PATSIIENTAM.schema],
  mainHtml: `${BC_PATSIIENTAM.html}${titleBand('Пацієнтам')}

  <section class="section page-intro">
    <div class="container">
      <p>Нижче — покроковий опис того, як відбувається звернення через MEDHUB до Sheba Medical Center: від першого контакту до супроводу під час лікування в Ізраїлі.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <ol class="steps-list">
        <li><span class="steps-number">1</span><div><h3>Як звернутися</h3><p>Залиште заявку на сайті або зв'яжіться з MEDHUB телефоном чи WhatsApp.</p></div></li>
        <li><span class="steps-number">2</span><div><h3>Необхідні документи</h3><p>Виписки, діагнози, результати досліджень та знімки — у зручному форматі.</p></div></li>
        <li><span class="steps-number">3</span><div><h3>Медична оцінка</h3><p>MEDHUB передає документи профільному підрозділу Sheba Medical Center.</p></div></li>
        <li><span class="steps-number">4</span><div><h3>Строки відповіді</h3><p>Координатор MEDHUB інформує пацієнта про орієнтовні строки розгляду звернення.</p></div></li>
        <li><span class="steps-number">5</span><div><h3>Підготовка до візиту</h3><p>MEDHUB допомагає узгодити дати та зібрати необхідні документи перед поїздкою.</p></div></li>
        <li><span class="steps-number">6</span><div><h3>Перебування в Ізраїлі</h3><p>Консультації, діагностика та лікування проходять у Sheba Medical Center.</p></div></li>
      </ol>
    </div>
  </section>

  <section class="section support-section section-alt" id="suprovid">
    <div class="container">
      <h2><strong>Супровід</strong> MEDHUB</h2>
      <div class="support-body">
        <p>MEDHUB супроводжує пацієнта на кожному етапі — від першого звернення до завершення лікування. Команда допомагає:</p>
        <p>
          <span>отримати та проаналізувати медичні документи;</span>
          <span>підібрати профільного спеціаліста Sheba Medical Center;</span>
          <span>сформувати попередній медичний план;</span>
          <span>організувати консультації та діагностику;</span>
          <span>скласти розклад візитів;</span>
          <span>забезпечити переклад;</span>
          <span>допомогти з організаційними питаннями;</span>
          <span>підтримувати зв'язок із пацієнтом у процесі лікування;</span>
          <span>отримати підсумкові медичні документи після лікування.</span>
        </p>
      </div>
    </div>
  </section>

  <section class="section" id="faq">
    <div class="container">
      <h2>Часті запитання</h2>
      <div class="faq-list">
${FAQ.map(([q, a]) => `        <div class="faq-item">
          <h3>${q}</h3>
          <p>${a}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Готові',
  headingAccent: 'звернутися до MEDHUB?',
  text: 'Надішліть медичні документи, і координатор допоможе визначити наступні кроки.',
  emphasis: '',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Надіслати документи',
  secondaryHref: '/kontakty/#contact-form',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== 6. КОНТАКТИ =======================================================
const BC_KONTAKTY = crumbs([['Головна', '/'], ['Контакти', '/kontakty/']]);
pages.push({
  slug: 'kontakty',
  outPath: 'kontakty/index.html',
  title: 'Контакти MEDHUB | Авторизований представник Sheba Medical Center в Україні',
  description: 'Контакти MEDHUB в Україні: телефон, WhatsApp, email, адреса, години роботи та форма для надсилання медичних документів.',
  canonicalPath: '/kontakty/',
  schema: [MEDHUB_SCHEMA, BC_KONTAKTY.schema],
  mainHtml: `${BC_KONTAKTY.html}${titleBand('Контакти MEDHUB')}

  <section class="section page-intro">
    <div class="container">
      <p>Зв'яжіться з MEDHUB в Україні будь-яким зручним способом, або залиште заявку у формі нижче — координатор зв'яжеться з вами.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="contact-info-grid">
        <div class="contact-info-item">
          <h3>Телефон (українська мова)</h3>
          <p><a href="tel:+380674067357">+380 67 406 73 57</a></p>
        </div>
        <div class="contact-info-item">
          <h3>WhatsApp (українська мова)</h3>
          <p><a href="https://wa.me/380674067357">+380 67 406 73 57</a></p>
        </div>
        <div class="contact-info-item">
          <h3>Email</h3>
          <p><a href="mailto:info@medhub.group">info@medhub.group</a></p>
        </div>
        <div class="contact-info-item">
          <h3>Години роботи</h3>
          <p>Пн–Пт, 09:00–18:00 (за київським часом)</p>
        </div>
        <div class="contact-info-item">
          <h3>Адреса представництва MEDHUB</h3>
          <p>Голосіївський проспект, 70, офісна будівля готелю «Мир», Київ</p>
        </div>
      </div>

      <!-- Map shows Sheba Medical Center's location in Israel, where treatment actually takes place. -->
      <div class="contact-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=34.8215%2C32.0295%2C34.8635%2C32.0515&amp;layer=mapnik&amp;marker=32.0407%2C34.8425" title="Sheba Medical Center, Ізраїль" loading="lazy"></iframe>
      </div>
      <p class="map-caption">Карта показує розташування Sheba Medical Center в Ізраїлі, де проходить лікування.</p>
    </div>
  </section>

  <section class="section form-section" id="contact-form">
    <div class="container form-section-inner">
      <div class="form-intro">
        <h2>Надіслати медичні документи</h2>
        <p>Опишіть медичне питання та за потреби додайте медичні документи — координатор MEDHUB зв'яжеться з вами.</p>
      </div>
${renderConsultationForm()}
    </div>
  </section>
`,
});

// =========================================================================
// ENGLISH VERSION — same structure/classes as the Ukrainian pages above,
// served under /en/. See PAGE_FAMILIES for the uk<->en URL mapping used
// by the language switcher and hreflang tags.
// =========================================================================

// ===== EN 1. HOME =======================================================
pages.push({
  slug: 'home',
  lang: 'en',
  outPath: 'en/index.html',
  title: 'MEDHUB | Authorized Representative of Sheba Medical Center in Ukraine',
  description: 'MEDHUB is the authorized representative of Sheba Medical Center in Ukraine. Organizing consultations, diagnostics, and treatment for Ukrainian patients at Sheba Medical Center, Israel.',
  canonicalPath: '/en/',
  schema: [MEDHUB_SCHEMA_EN, SHEBA_SCHEMA],
  mainHtml: `  <section class="hero hero--home">
    <div class="container hero-inner">
      <div class="hero-text">
        <p class="eyebrow">MEDHUB — ${REP_LINE_EN}</p>
        <h1>Treatment at Sheba Medical Center</h1>
        <p>We help patients from Ukraine get a consultation, undergo diagnostics, and arrange treatment at Sheba Medical Center, Israel.</p>
        <p>MEDHUB coordinates the patient's inquiry — from submitting medical documents to arranging the visit and providing support.</p>
        <div class="hero-actions">
          <a href="/en/contacts/" class="btn btn-pink">Get a Consultation
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
          <a href="/en/contacts/#contact-form" class="btn btn-outline">Send Medical Documents
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2315FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/hero-staff.jpg" alt="Sheba Medical Center — staff and patients" loading="lazy" width="760" height="310">
      </div>
    </div>
  </section>

  <section class="section" id="about-medhub">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <h2>Sheba Medical Center's Representative Office in Ukraine</h2>
        <p class="section-lead">MEDHUB is the authorized representative of Sheba Medical Center in Ukraine and coordinates inquiries from Ukrainian patients to one of Israel's leading medical centers.</p>
        <div class="advantage-item">
          <h3><strong>Forwarding</strong> medical documents</h3>
          <p>We accept discharge summaries, scans, and test results, and prepare them for the relevant specialist.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Consultation</strong> coordination</h3>
          <p>We process the initial inquiry and determine which Sheba Medical Center department it relates to.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Arranging the diagnostic</strong> or treatment program</h3>
          <p>We forward the medical information to Sheba specialists and help with the examination program.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Patient</strong> support</h3>
          <p>We coordinate dates, stay in touch with the patient, and help prepare for the visit to Israel.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Sheba Medical Center — building" loading="lazy" width="535" height="420">
      </div>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <img src="/assets/brand/sheba-medical-center-logo.svg" alt="Sheba Medical Center" class="sheba-logo-block">
      <h2>Sheba Medical Center</h2>
      <div class="support-body">
        <p>Sheba Medical Center is one of the leading multidisciplinary medical centers in Israel and the Middle East, with dozens of clinical departments, research centers, and a rehabilitation clinic on a single campus. This is where MEDHUB arranges consultations, diagnostics, and treatment for Ukrainian patients.</p>
      </div>
      <a href="/en/sheba-medical-center/" class="text-link">Learn more about Sheba →</a>
    </div>
  </section>

  <section class="section" id="directions">
    <div class="container">
      <h2><strong>Treatment</strong> directions</h2>
      <p class="section-lead">Treatment takes place at Sheba Medical Center. MEDHUB arranges inquiries for any of the center's departments.</p>
      <div class="directions-grid directions-grid--compact">
        <div class="direction-card"><h3>Oncology</h3><p>Diagnosis and treatment of cancer in adults and children.</p></div>
        <div class="direction-card"><h3>Cardiology</h3><p>Diagnosis and treatment of heart and vascular diseases.</p></div>
        <div class="direction-card"><h3>Neurology</h3><p>Diagnosis and treatment of nervous system disorders.</p></div>
        <div class="direction-card"><h3>Orthopedics</h3><p>Treatment of musculoskeletal diseases and injuries.</p></div>
        <div class="direction-card"><h3>Hematology</h3><p>Diagnosis and treatment of blood and blood-forming system disorders.</p></div>
        <div class="direction-card"><h3>Transplantology</h3><p>Organ and bone marrow transplant programs.</p></div>
      </div>
      <a href="/en/treatment-directions/" class="text-link">View all treatment directions →</a>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <h2>How it works</h2>
      <ol class="steps-list">
        <li><span class="steps-number">1</span><div><h3>Send documents</h3><p>Discharge summaries, scans, and test results — to your MEDHUB coordinator.</p></div></li>
        <li><span class="steps-number">2</span><div><h3>Request coordination</h3><p>MEDHUB processes the inquiry and identifies the relevant department.</p></div></li>
        <li><span class="steps-number">3</span><div><h3>Medical assessment</h3><p>Documents are forwarded to Sheba Medical Center specialists.</p></div></li>
        <li><span class="steps-number">4</span><div><h3>Consultation or treatment program</h3><p>Sheba prepares a preliminary diagnostic or treatment plan.</p></div></li>
        <li><span class="steps-number">5</span><div><h3>Visit arrangement</h3><p>MEDHUB coordinates dates, doctors, and necessary examinations.</p></div></li>
        <li><span class="steps-number">6</span><div><h3>Support</h3><p>MEDHUB stays in touch throughout the entire process.</p></div></li>
      </ol>
    </div>
  </section>

${ctaBand({
  heading: 'Need a consultation',
  headingAccent: 'regarding treatment at Sheba?',
  text: 'Contact MEDHUB in Ukraine — a coordinator will help determine the next steps.',
  emphasis: '',
  primaryLabel: 'Get a Consultation',
  primaryHref: '/en/contacts/',
  secondaryLabel: 'Treatment Directions',
  secondaryHref: '/en/treatment-directions/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'A doctor consulting with a patient',
})}
`,
});

// ===== EN 2. ABOUT MEDHUB ===============================================
pages.push({
  slug: 'pro-medhub',
  lang: 'en',
  outPath: 'en/about-medhub/index.html',
  title: 'About MEDHUB | Authorized Representative of Sheba Medical Center in Ukraine',
  description: 'MEDHUB is the authorized representative of Sheba Medical Center in Ukraine: inquiry coordination, patient support, and communication with the medical center in Israel.',
  canonicalPath: '/en/about-medhub/',
  schema: MEDHUB_SCHEMA_EN,
  mainHtml: `${titleBand('About MEDHUB')}

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <h2><strong>MEDHUB — the representative office</strong> of Sheba Medical Center in Ukraine</h2>
        <p>MEDHUB is an authorized representative of Sheba Medical Center in Ukraine. We do not provide treatment ourselves — our role is to organize and coordinate a Ukrainian patient's inquiry to Sheba Medical Center.</p>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed office/team photo -->
        <img src="/assets/temp-dev-refs/cta-consultation.jpg" alt="A MEDHUB coordinator on a consultation call" loading="lazy" width="760" height="310" style="aspect-ratio:760/310;">
      </div>
    </div>
  </section>

  <section class="section" id="role">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <div class="advantage-item">
          <h3><strong>Representative,</strong> not a clinic</h3>
          <p>MEDHUB is an organizational representative structure. Medical consultations, diagnostics, and treatment are provided exclusively by Sheba Medical Center and its specialists.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Inquiry</strong> coordination</h3>
          <p>We receive the patient's inquiry, process medical documents, and forward them to the relevant department at Sheba.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Communication</strong> with the medical center</h3>
          <p>We maintain communication between the patient and Sheba Medical Center throughout the entire process — from the first inquiry to the completion of treatment.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Travel</strong> support</h3>
          <p>We help the patient prepare for the visit to Israel: scheduling, organizational matters, document translation.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed office/team photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Sheba Medical Center — MEDHUB's medical partner" loading="lazy" width="535" height="420">
      </div>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2><strong>Cooperation</strong> with Sheba Medical Center</h2>
      <div class="support-body">
        <p>MEDHUB works directly with Sheba Medical Center in Israel. Every inquiry that goes through MEDHUB is coordinated with the relevant department of the center — from the initial medical assessment to forming a diagnostic or treatment plan.</p>
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Ready to contact',
  headingAccent: 'MEDHUB?',
  text: 'Send your medical documents — a MEDHUB coordinator will contact you.',
  emphasis: '',
  primaryLabel: 'Contact MEDHUB',
  primaryHref: '/en/contacts/',
  secondaryLabel: 'Sheba Medical Center',
  secondaryHref: '/en/sheba-medical-center/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'A doctor consulting with a patient',
})}
`,
});

// ===== EN 3. SHEBA MEDICAL CENTER =======================================
pages.push({
  slug: 'sheba-medical-center',
  lang: 'en',
  outPath: 'en/sheba-medical-center/index.html',
  title: 'Sheba Medical Center | MEDHUB — Representative in Ukraine',
  description: "Sheba Medical Center is one of Israel's leading medical centers: clinical directions, diagnostics, treatment, research. MEDHUB coordinates inquiries from Ukrainian patients.",
  canonicalPath: '/en/sheba-medical-center/',
  schema: [MEDHUB_SCHEMA_EN, SHEBA_SCHEMA],
  mainHtml: `${titleBand('Sheba Medical Center')}

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <p class="eyebrow">MEDHUB represents Sheba in Ukraine → Sheba provides medical treatment in Israel</p>
        <h2><strong>One of the largest medical centers</strong> in the Middle East</h2>
        <p>Sheba Medical Center is located in Ramat Gan, near Tel Aviv, and brings together dozens of clinical departments, research centers, and a rehabilitation clinic on a single campus.</p>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Sheba Medical Center campus" loading="lazy" width="535" height="420" style="aspect-ratio:760/310;object-position:center;">
      </div>
    </div>
  </section>

  <section class="section support-section">
    <div class="container">
      <h2><strong>History</strong> of the medical center</h2>
      <div class="support-body">
        <p>Sheba Medical Center was founded in 1948 as a military hospital; it has since grown into one of the region's largest multidisciplinary medical complexes. Today it is an academic hospital affiliated with a leading medical school, combining clinical practice, teaching, and research.</p>
      </div>
    </div>
  </section>

  <section class="section" id="about">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <div class="advantage-item">
          <h3><strong>Scale</strong> of the center</h3>
          <p>Dozens of departments and clinical centers on one campus — from oncology to rehabilitation.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Diagnostics</strong> and technology</h3>
          <p>Modern equipment and up-to-date diagnostic and treatment protocols in cardiology, oncology, neurology, and other fields.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Research</strong> and innovation</h3>
          <p>Sheba participates in clinical research and introduces new diagnostic and treatment methods.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Specialists</strong> and academic foundation</h3>
          <p>The center's doctors combine clinical practice with teaching and research at the medical school.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>International</strong> patients</h3>
          <p>Sheba accepts patients from other countries; in Ukraine, inquiries are coordinated by MEDHUB.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/hero-staff.jpg" alt="Sheba Medical Center staff" loading="lazy" width="760" height="310">
      </div>
    </div>
  </section>

  <section class="section support-section section-alt">
    <div class="container">
      <h2><strong>Clinical</strong> directions</h2>
      <div class="support-body">
        <p>Oncology, cardiology, neurology, orthopedics, hematology, pediatrics, rehabilitation, transplantology, and other directions — a detailed list and brief description of each direction is available on a separate page.</p>
      </div>
      <a href="/en/treatment-directions/" class="text-link">View treatment directions →</a>
    </div>
  </section>

${ctaBand({
  heading: 'Need a consultation',
  headingAccent: 'regarding treatment at Sheba?',
  text: 'Contact MEDHUB in Ukraine — a coordinator will help determine the next steps.',
  emphasis: '',
  primaryLabel: 'Get a Consultation',
  primaryHref: '/en/contacts/',
  secondaryLabel: 'Sheba Doctors',
  secondaryHref: '/en/doctors/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'A doctor consulting with a patient',
})}
`,
});

// ===== EN 4. TREATMENT DIRECTIONS (catalog) =============================
const DIRECTIONS_EN = [
  ['Oncology', 'Diagnosis and treatment of cancer in adults and children, including chemotherapy, radiation therapy, and targeted therapy.', 'onkologiya'],
  ['Cardiology', 'Diagnosis and treatment of heart and vascular diseases, including invasive cardiology and cardiac surgery.', 'kardiologiya'],
  ['Neurology', 'Diagnosis and treatment of diseases of the brain, spinal cord, and peripheral nervous system.', 'nevrologiya'],
  ['Neurosurgery', 'Surgical treatment of diseases and injuries of the brain and spinal cord.', 'neirokhirurgiya'],
  ['Orthopedics', 'Treatment of musculoskeletal diseases and injuries, joint replacement surgery.', 'ortopediya'],
  ['Gynecology', 'Diagnosis and treatment of gynecological conditions, including gynecological oncology.', 'ginekologiya'],
  ['Urology', 'Diagnosis and treatment of diseases of the urinary and reproductive systems.', 'urologiya'],
  ['Hematology', 'Diagnosis and treatment of diseases of the blood and blood-forming system.', 'gematologiya'],
  ['Pediatrics', 'Diagnosis and treatment of childhood diseases, including pediatric oncology and surgery.', 'pediatriya'],
  ['Rehabilitation', 'Rehabilitation programs after stroke, injury, and surgery.', 'reabilitatsiya'],
  ['Transplantology', 'Organ and bone marrow transplant programs.', 'transplantologiya'],
  ['Genetics', 'Genetic diagnostics, counseling, and support for patients with hereditary conditions.', 'genetyka'],
];

pages.push({
  slug: 'napriamy-likuvannia',
  lang: 'en',
  outPath: 'en/treatment-directions/index.html',
  title: 'Treatment Directions at Sheba Medical Center | MEDHUB',
  description: 'Treatment directions at Sheba Medical Center: oncology, cardiology, neurology, orthopedics, hematology, pediatrics, rehabilitation, transplantology, and more. MEDHUB coordinates inquiries from Ukrainian patients.',
  canonicalPath: '/en/treatment-directions/',
  schema: [MEDHUB_SCHEMA_EN, SHEBA_SCHEMA],
  mainHtml: `${titleBand('Treatment Directions')}

  <section class="section page-intro">
    <div class="container">
      <p>Treatment in all the directions below takes place at Sheba Medical Center. MEDHUB, as the center's representative in Ukraine, coordinates the patient's inquiry and forwards medical documents to the relevant department. Each direction will later get its own detailed page.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="directions-grid">
${DIRECTIONS_EN.map(([name, desc, slug]) => `        <!-- future page: /en/treatment-directions/${slug}/ -->
        <div class="direction-card">
          <h3>${name} at Sheba Medical Center</h3>
          <p>${desc}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: "Can't find",
  headingAccent: 'the right direction?',
  text: "Describe your medical question to a MEDHUB coordinator — we'll help you determine which Sheba department to contact.",
  emphasis: '',
  primaryLabel: 'Get a Consultation',
  primaryHref: '/en/contacts/',
  secondaryLabel: 'Sheba Doctors',
  secondaryHref: '/en/doctors/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'A doctor consulting with a patient',
})}
`,
});

// ===== EN 5. SHEBA TEAM (real International Patient Department staff) ===
// Source: https://www.shebaonline.ru/nashi-sotrudniki/ — see the DOCTORS
// array above for the sourcing note; these are the English equivalents.
const DOCTORS_EN = [
  ['/assets/team/mika-amram.jpg', 'Mika Amram', 'Director of the International Patient Department', 'Hebrew, English'],
  ['/assets/team/vered-cohen.jpg', 'Vered Cohen Hershaft', 'Head of the Global Medical Services Department', ''],
  ['/assets/team/yelena-kolesnik.jpg', 'Elena Kolesnik', 'Senior Medical Coordinator', 'Hebrew, Russian, English'],
  ['/assets/team/olya-mayzeleva.jpg', 'Olga Mayzeleva', 'Head of the Medical Consulting Department', 'Hebrew, Russian'],
  ['/assets/team/olesya-chernihovski.jpg', 'Olesya Chernihovsky', 'Head of AI, Innovation & Clinical Integration', 'Hebrew, Russian, English'],
  ['/assets/team/amir-roitman.jpg', 'Amir Roitman', 'Medical Consultant', 'Hebrew, English, Russian'],
  ['/assets/team/hannah-or.jpg', 'Hannah Or', 'Medical Consultant', 'Hebrew, English'],
  ['/assets/team/nikita-zubenko.jpg', 'Nikita Zubenko', 'Medical Consultant', 'Hebrew, Russian, English'],
  ['/assets/team/bogdan-medovar.jpg', 'Bogdan Medovar', 'Medical Curator', 'Hebrew, Russian, English, Ukrainian'],
  ['/assets/team/vera-gerova.jpg', 'Vera Gerova', 'Medical Coordinator — Gynecology, Oncogynecology & IVF', 'Hebrew, Russian'],
  ['/assets/team/victoria-zen.jpg', 'Victoria Zen', 'Medical Coordinator — Hemato-Oncology', 'Hebrew, Russian, English'],
  ['/assets/team/galit-goman.jpg', 'Galit Goman', 'Medical Coordinator', 'Hebrew, Russian, English'],
  ['/assets/team/rimma-pustovoitovska.jpg', 'Rimma Pustovoytovskaya', 'Medical Coordinator — Pediatric Oncology', 'Hebrew, Russian, English'],
  ['/assets/team/milana-tilyuk.jpg', 'Milana Tilyuk', 'Medical Coordinator — Pediatrics & Pediatric Hemato-Oncology', 'Hebrew, Russian'],
];

pages.push({
  slug: 'likari',
  lang: 'en',
  outPath: 'en/doctors/index.html',
  title: 'Sheba Medical Center Team | MEDHUB',
  description: "Medical consultants and coordinators of Sheba Medical Center's International Patient Department. MEDHUB coordinates Ukrainian patient inquiries to this team.",
  canonicalPath: '/en/doctors/',
  schema: [MEDHUB_SCHEMA_EN, SHEBA_SCHEMA],
  mainHtml: `${titleBand('Sheba Medical Center Team')}

  <section class="section page-intro">
    <div class="container">
      <p>Sheba Medical Center's International Patient Department supports foreign patients from the first inquiry through arranging treatment. MEDHUB coordinates Ukrainian patient inquiries to this team.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="doctor-grid">
${DOCTORS_EN.map(([photo, name, title, langs]) => `        <div class="doctor-card">
          <img class="doctor-avatar" src="${photo}" alt="${name}" width="88" height="88" loading="lazy">
          <h3>${name}</h3>
          <span class="doctor-specialty">${title}</span>
          <span class="doctor-dept">Sheba Medical Center — International Patient Department</span>
          ${langs ? `<p class="doctor-desc">Languages: ${langs}.</p>` : ''}
          <a href="/en/contacts/" class="btn btn-outline btn-sm">Contact via MEDHUB
            <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2315FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Need help',
  headingAccent: 'arranging treatment?',
  text: "Send your medical documents — MEDHUB will pass your inquiry to Sheba Medical Center's International Patient Department team.",
  emphasis: '',
  primaryLabel: 'Get a Consultation',
  primaryHref: '/en/contacts/',
  secondaryLabel: 'Treatment Directions',
  secondaryHref: '/en/treatment-directions/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'A doctor consulting with a patient',
})}
`,
});

// ===== EN 6. PATIENTS (guide + FAQ) ======================================
const FAQ_EN = [
  ['How much does a consultation cost?', 'The cost of diagnostics and treatment is determined individually by Sheba Medical Center, depending on the medical case. MEDHUB does not set medical fees — the coordinator forwards the pricing request along with the examination program.'],
  ['What language is used for communication?', 'Inquiries to MEDHUB are handled in Ukrainian or Russian. MEDHUB coordinates communication with Sheba Medical Center specialists, arranging translation as needed.'],
  ['Can I send documents already translated into another language?', "Yes. If documents haven't been translated yet, MEDHUB will help arrange translation before forwarding them to Sheba specialists."],
  ['Who decides on the treatment program?', 'The medical assessment and diagnostic or treatment program are determined solely by Sheba Medical Center physicians. MEDHUB coordinates the process but does not make medical decisions.'],
];

pages.push({
  slug: 'patsiientam',
  lang: 'en',
  outPath: 'en/patients/index.html',
  title: 'For Patients | MEDHUB — Representative of Sheba Medical Center in Ukraine',
  description: 'How to reach MEDHUB, which documents are needed, how the medical assessment works, preparing for a visit to Sheba Medical Center, and frequently asked questions.',
  canonicalPath: '/en/patients/',
  schema: MEDHUB_SCHEMA_EN,
  mainHtml: `${titleBand('For Patients')}

  <section class="section page-intro">
    <div class="container">
      <p>Below is a step-by-step description of how an inquiry through MEDHUB to Sheba Medical Center works — from the first contact to support during treatment in Israel.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <ol class="steps-list">
        <li><span class="steps-number">1</span><div><h3>How to reach us</h3><p>Submit a request on the website or contact MEDHUB by phone or WhatsApp.</p></div></li>
        <li><span class="steps-number">2</span><div><h3>Required documents</h3><p>Discharge summaries, diagnoses, test results, and scans — in a convenient format.</p></div></li>
        <li><span class="steps-number">3</span><div><h3>Medical assessment</h3><p>MEDHUB forwards the documents to the relevant Sheba Medical Center department.</p></div></li>
        <li><span class="steps-number">4</span><div><h3>Response time</h3><p>The MEDHUB coordinator informs the patient of the estimated review time.</p></div></li>
        <li><span class="steps-number">5</span><div><h3>Preparing for the visit</h3><p>MEDHUB helps schedule dates and gather the necessary documents before the trip.</p></div></li>
        <li><span class="steps-number">6</span><div><h3>Staying in Israel</h3><p>Consultations, diagnostics, and treatment take place at Sheba Medical Center.</p></div></li>
      </ol>
    </div>
  </section>

  <section class="section support-section section-alt" id="suprovid">
    <div class="container">
      <h2><strong>MEDHUB</strong> support</h2>
      <div class="support-body">
        <p>MEDHUB supports the patient at every stage — from the first inquiry to the completion of treatment. The team helps to:</p>
        <p>
          <span>receive and review medical documents;</span>
          <span>select the right Sheba Medical Center specialist;</span>
          <span>prepare a preliminary medical plan;</span>
          <span>arrange consultations and diagnostics;</span>
          <span>schedule visits;</span>
          <span>provide translation;</span>
          <span>assist with organizational matters;</span>
          <span>stay in touch with the patient during treatment;</span>
          <span>obtain final medical documents after treatment.</span>
        </p>
      </div>
    </div>
  </section>

  <section class="section" id="faq">
    <div class="container">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">
${FAQ_EN.map(([q, a]) => `        <div class="faq-item">
          <h3>${q}</h3>
          <p>${a}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Ready to',
  headingAccent: 'contact MEDHUB?',
  text: 'Send your medical documents, and a coordinator will help determine the next steps.',
  emphasis: '',
  primaryLabel: 'Get a Consultation',
  primaryHref: '/en/contacts/',
  secondaryLabel: 'Send Documents',
  secondaryHref: '/en/contacts/#contact-form',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'A doctor consulting with a patient',
})}
`,
});

// ===== EN 7. CONTACTS ====================================================
pages.push({
  slug: 'kontakty',
  lang: 'en',
  outPath: 'en/contacts/index.html',
  title: 'MEDHUB Contacts | Authorized Representative of Sheba Medical Center in Ukraine',
  description: "MEDHUB's contacts in Ukraine: phone, WhatsApp, email, address, office hours, and a form for sending medical documents.",
  canonicalPath: '/en/contacts/',
  schema: MEDHUB_SCHEMA_EN,
  mainHtml: `${titleBand('MEDHUB Contacts')}

  <section class="section page-intro">
    <div class="container">
      <p>Contact MEDHUB in Ukraine using whichever method is convenient, or leave a request in the form below — a coordinator will get in touch with you.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="contact-info-grid">
        <div class="contact-info-item">
          <h3>Phone (Ukrainian language)</h3>
          <p><a href="tel:+380674067357">+380 67 406 73 57</a></p>
        </div>
        <div class="contact-info-item">
          <h3>WhatsApp (Ukrainian language)</h3>
          <p><a href="https://wa.me/380674067357">+380 67 406 73 57</a></p>
        </div>
        <div class="contact-info-item">
          <h3>Email</h3>
          <p><a href="mailto:info@medhub.group">info@medhub.group</a></p>
        </div>
        <div class="contact-info-item">
          <h3>Office hours</h3>
          <p>Mon–Fri, 9:00 AM–6:00 PM (Kyiv time)</p>
        </div>
        <div class="contact-info-item">
          <h3>MEDHUB office address</h3>
          <p>70 Holosiivskyi Avenue, Hotel Mir office building, Kyiv, Ukraine</p>
        </div>
      </div>

      <!-- Map shows Sheba Medical Center's location in Israel, where treatment actually takes place. -->
      <div class="contact-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=34.8215%2C32.0295%2C34.8635%2C32.0515&amp;layer=mapnik&amp;marker=32.0407%2C34.8425" title="Sheba Medical Center, Israel" loading="lazy"></iframe>
      </div>
      <p class="map-caption">The map shows the location of Sheba Medical Center in Israel, where treatment takes place.</p>
    </div>
  </section>

  <section class="section form-section" id="contact-form">
    <div class="container form-section-inner">
      <div class="form-intro">
        <h2>Send Medical Documents</h2>
        <p>Describe your medical question and, if needed, attach medical documents — a MEDHUB coordinator will contact you.</p>
      </div>
${renderConsultationForm('en')}
    </div>
  </section>
`,
});

// ===== SHEBA × UKRAINE: HISTORY / HUMANITARIAN CHRONICLE =================
// Every factual claim below is sourced — see the "Джерела та матеріали"
// block at the end of the page for the list. Statistics verified against
// PMC9574159 (Prehospital and Disaster Medicine); the Krakow-airport story
// and the Har-Even quotes verified against eJewishPhilanthropy/AFSMC and
// sheba-global.com/fieldhospitalukraine respectively. Photos are real,
// pulled from Sheba's and Kvitna's own official sites — see credits under
// each image. Where no rights-cleared photo could be sourced, a labeled
// placeholder with a PHOTO RIGHTS TO BE CONFIRMED comment stands in.
const SHEBA_UKRAINE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Sheba Medical Center та Україна: допомога, що почалася у перші тижні війни',
  description: 'Від польового госпіталю Kochav Meir та телемедицини до мобільної клініки жіночого здоров\'я, навчання українських лікарів і діагностичного центру в Києві.',
  inLanguage: 'uk',
  url: `${SITE_URL}/sheba-ukraine-dopomoha/`,
  publisher: { '@type': 'Organization', name: 'MEDHUB', url: SITE_URL },
  about: { '@type': 'MedicalOrganization', name: SHEBA_NAME },
};

const BC_DOPOMOHA = crumbs([
  ['Головна', '/'],
  ['Sheba Medical Center', '/sheba-medical-center/'],
  ['Допомога Україні з 2022 року', '/sheba-ukraine-dopomoha/'],
]);

pages.push({
  slug: 'sheba-ukraine-dopomoha',
  outPath: 'sheba-ukraine-dopomoha/index.html',
  title: 'Sheba Medical Center та Україна: медична допомога з 2022 року | MEDHUB',
  description: 'Від польового госпіталю Kochav Meir та телемедицини до мобільної клініки жіночого здоров\'я, навчання українських лікарів і діагностичного центру в Києві. Історія допомоги Sheba Medical Center Україні з 2022 року.',
  canonicalPath: '/sheba-ukraine-dopomoha/',
  schema: [SHEBA_UKRAINE_SCHEMA, BC_DOPOMOHA.schema, MEDHUB_SCHEMA, SHEBA_SCHEMA],
  mainHtml: `${BC_DOPOMOHA.html}  <section class="history-hero">
    <div class="history-hero-media">
      <!-- Photo: Sheba Medical Center (shebaonline.org) — aerial view of the Kochav Meir field hospital tent complex, Mostyska, 2022 -->
      <img src="/assets/temp-dev-refs/kochav-meir-tents.jpg" alt="Польовий госпіталь Kochav Meir у Мостиськах, 2022 рік" loading="eager" width="768" height="1024">
    </div>
    <div class="history-hero-content">
      <div class="container">
        <p class="eyebrow">SHEBA MEDICAL CENTER × UKRAINE</p>
        <h1>Sheba Medical Center та Україна: допомога, що почалася у перші тижні війни</h1>
        <p>З перших тижнів повномасштабного вторгнення Sheba Medical Center долучився до допомоги Україні — через телемедицину, польовий госпіталь, лікування пацієнтів, підготовку українських медиків та створення довгострокових медичних програм.</p>
        <ul class="timeline-nav">
          <li><a href="#y2022">2022</a></li>
          <li><a href="#y2023">2023</a></li>
          <li><a href="#y2024">2024</a></li>
          <li><a href="#y2025">2025</a></li>
          <li><a href="#segodni">Сьогодні</a></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">

      <div class="year-block" id="y2022">
        <div class="year-tag"><span class="num">2022</span><span class="label">Екстрена допомога</span></div>
        <div class="year-body">
          <h3>Лютий–березень 2022: допомога почалася ще до відкриття польового госпіталю</h3>
          <p>Ще до розгортання польового госпіталю фахівці Sheba Beyond дистанційно консультували українських пацієнтів та медичні команди, які працювали з біженцями. Телемедична платформа Sheba Beyond забезпечувала дистанційні консультації спеціалістів, акушерську допомогу, віддалений контроль обстежень і портативну діагностику — насамперед для українських жінок і дітей, які покинули країну.</p>
          <div class="photo-block">
            <!-- PHOTO RIGHTS TO BE CONFIRMED: real photo of a Sheba Beyond telemedicine consultation for a Ukrainian patient not yet sourced from a rights-cleared channel -->
            <div class="photo-placeholder">Телемедична консультація Sheba Beyond для української пацієнтки, 2022 рік<br>(фото буде додано після підтвердження прав використання)</div>
          </div>

          <h3>Березень 2022: польовий госпіталь Kochav Meir у Мостиськах</h3>
          <p>Держава Ізраїль розгорнула в Україні цивільний польовий госпіталь Kochav Meir. Sheba Medical Center став ключовим медичним центром місії та відігравав провідну роль у створенні й роботі госпіталю разом із Міністерством охорони здоров'я та Міністерством закордонних справ Ізраїлю й іншими ізраїльськими медичними організаціями.</p>
          <p>Госпіталь розпочав роботу <strong>22 березня 2022 року</strong> в місті <strong>Мостиська, Львівська область</strong>, і працював <strong>шість тижнів</strong>. У його складі діяли тріаж, невідкладна допомога, педіатрія, акушерство та гінекологія, хірургія, ортопедія, психічне здоров'я, лабораторія, медична візуалізація, аптека та телемедицина Sheba Beyond.</p>

          <div class="stats-strip">
            <div class="stat-item"><span class="num">6 161</span><span class="label">пацієнт</span></div>
            <div class="stat-item"><span class="num">954</span><span class="label">дитини</span></div>
            <div class="stat-item"><span class="num">59</span><span class="label">операцій</span></div>
            <div class="stat-item"><span class="num">65</span><span class="label">госпіталізованих пацієнтів</span></div>
            <div class="stat-item"><span class="num">103</span><span class="label">телемедичні консультації</span></div>
            <div class="stat-item"><span class="num">995</span><span class="label">лабораторних досліджень</span></div>
            <div class="stat-item"><span class="num">846</span><span class="label">досліджень медичної візуалізації</span></div>
            <div class="stat-item"><span class="num">7</span><span class="label">пацієнтів перевезли до Ізраїлю для складнішого лікування</span></div>
          </div>
          <p class="stats-footnote">796 українських медичних працівників пройшли навчання в межах місії.</p>

          <div class="photo-block">
            <!-- PHOTO RIGHTS TO BE CONFIRMED: additional photo of medical staff at work inside the field hospital not yet sourced -->
            <div class="photo-placeholder">Лікарі за роботою всередині госпіталю Kochav Meir<br>(фото буде додано після підтвердження прав використання)</div>
          </div>
        </div>
      </div>

      <div class="year-block">
        <div class="year-tag"><span class="num">—</span><span class="label">Ключова постать</span></div>
        <div class="year-body">
          <h3>Йоель Хар-Евен: одна з ключових постатей медичної місії Sheba в Україні</h3>
          <p>Йоель Хар-Евен відіграв одну з ключових особистих ролей у розвитку гуманітарної роботи Sheba в Україні — від керівництва місією польового госпіталю у 2022 році до участі у створенні довгострокових медичних проєктів. Сьогодні він обіймає посаду <strong>Vice President of Global Affairs, Sheba Medical Center</strong>.</p>

          <div class="profile-block">
            <div>
              <!-- PHOTO RIGHTS TO BE CONFIRMED: an official Sheba Global portrait of Yoel Har-Even has not yet been sourced from a rights-cleared channel -->
              <div class="photo-placeholder" style="aspect-ratio:1;">Yoel Har-Even<br>(портрет буде додано після підтвердження прав використання)</div>
              <p class="profile-name">Yoel Har-Even</p>
              <p class="profile-title">Vice President of Global Affairs, Sheba Medical Center</p>
            </div>
            <div class="profile-body">
              <h3>2022 — Kochav Meir</h3>
              <p>У 2022 році Хар-Евен очолював Sheba Global і безпосередньо керував місією Sheba в Україні разом із професором Ельхананом Бар-Оном, директором Центру гуманітарної та кризової медицини Sheba. Він перебував безпосередньо в Україні, брав участь у розгортанні польового госпіталю та публічно представляв гуманітарну місію Sheba.</p>

              <div class="quote-block">
                <p>«Наше завдання — щоб люди в Україні знали, що вони не самі».</p>
                <cite><strong>Yoel Har-Even</strong>Sheba Global, 2022 · sheba-global.com/fieldhospitalukraine</cite>
              </div>

              <h3>Весна 2022 — переїзд до мобільної клініки</h3>
              <p>Випадкова зустріч у краківському аеропорту стала початком нового етапу. Наприкінці квітня 2022 року, повертаючись до Ізраїлю після чергового етапу роботи польового госпіталю, Хар-Евен випадково познайомився з Ораном Сінгером, співзасновником організації Corridor — Israeli Aid for Ukraine: почувши, як Хар-Евен розмовляє на івриті, Сінгер підійшов до нього. Розмова про потреби українських жінок переросла у партнерство Sheba, Corridor та фонду «Квітна».</p>
            </div>
          </div>
        </div>
      </div>

      <div class="year-block" id="y2023-clinic">
        <div class="year-tag"><span class="num">2022–23</span><span class="label">Довгострокові проєкти</span></div>
        <div class="year-body">
          <h3>Від польового госпіталю — до мобільної клініки жіночого здоров'я</h3>
          <p>Після гострої фази допомоги Sheba не залишила Україну. Разом з Corridor — Israeli Aid for Ukraine та Благодійним фондом «Квітна» центр долучився до створення мобільної медичної платформи для жінок, які через війну втратили звичний доступ до медичної допомоги: акушерство та гінекологія, УЗД, скринінг раку молочної залози, скринінг раку шийки матки, оцінка ендометрія, психологічна підтримка, телемедицина та консультації спеціалістів.</p>
          <p>Роль Sheba в проєкті — медична експертиза, розробка клінічної моделі, телемедичні консультації, підготовка українських лікарів і підтримка обладнанням. American Friends of Sheba профінансували придбання трейлера — близько <strong>$60 000</strong> — після чого його відправили до Гамбурга для переобладнання під мобільну клініку.</p>
          <p>Хар-Евен наполягав на моделі, в якій фізична медична допомога обов'язково супроводжується психологічною підтримкою постраждалих від війни. Саме участь Хар-Евена та Sheba надала проєкту доступ до медичної експертизи, міжнародної підтримки та телемедичних можливостей великого медичного центру — але ідея мобільної клініки первинно обговорювалася Corridor і «Квітною», а Sheba долучилася вже після зустрічі Сінгера й Хар-Евена в Кракові.</p>
        </div>
      </div>

      <div class="year-block" id="y2023">
        <div class="year-tag"><span class="num">2023</span><span class="label">Клініка запрацювала</span></div>
        <div class="year-body">
          <h3>2023: клініка починає працювати для українських жінок</h3>
          <p>Пересувна медична платформа почала виїжджати до громад і груп жінок, для яких регулярний доступ до профілактичної діагностики був ускладнений війною — у регіонах, серед переміщених жінок, а згодом і серед військовослужбовиць та ветеранок. Усі обстеження — безоплатні.</p>
          <div class="photo-block">
            <!-- Photo: Kvitna (kvitna.org.ua) — Mobile Women's Health Clinic trailer, Sheba + Corridor + Kvitna branding -->
            <img src="/assets/temp-dev-refs/mobile-clinic-trailer.jpg" alt="Пересувна клініка жіночого здоров'я — спільний проєкт Sheba Medical Center, Corridor та БФ «Квітна»" loading="lazy" width="1024" height="454">
            <p class="photo-caption">Пересувна клініка жіночого здоров'я — спільний проєкт Sheba Medical Center, Corridor та БФ «Квітна». Фото: kvitna.org.ua</p>
          </div>

          <h3>Обладнання та подальша підтримка</h3>
          <p>У матеріалах фонду «Квітна» окремо відзначалася особиста підтримка з боку Sheba Medical Center та Yoel Har-Even у питаннях оснащення платформи, зокрема сучасним діагностичним обладнанням.</p>
          <div class="photo-block">
            <!-- Photo: Kvitna (kvitna.org.ua) — inside the mobile clinic with medical staff and a GE Versana Active ultrasound machine. Individuals in the photo are not identified with confidence and are captioned generically. -->
            <img src="/assets/temp-dev-refs/mobile-clinic-interior.jpg" alt="Медичний персонал усередині пересувної клініки з апаратом УЗД" loading="lazy" width="1024" height="768">
            <p class="photo-caption">Всередині пересувної клініки: медичний персонал та апарат УЗД. Фото: kvitna.org.ua</p>
          </div>

          <h3>2023: українсько-ізраїльський медичний діалог</h3>
          <p>Першу леді України Олену Зеленську, яка відвідала Sheba Medical Center разом із першою леді Ізраїлю, ознайомили з роботою центру у сферах реабілітації, лікування наслідків тяжких травм, дитячої медицини, психологічної допомоги дітям та досвіду Ізраїлю в роботі під час тривалих криз. Цей візит — окрема частина розвитку медичних зв'язків між Україною та Sheba, а не спільний проєкт MEDHUB чи «Квітної».</p>
        </div>
      </div>

      <div class="year-block" id="y2024">
        <div class="year-tag"><span class="num">2023–25</span><span class="label">Передача знань</span></div>
        <div class="year-body">
          <h3>Передача знань: допомога, яка залишається після завершення місії</h3>
          <p>Ще в Kochav Meir Sheba створила спеціальну програму підготовки українських медичних фахівців — <strong>796 українських медичних працівників пройшли навчання</strong> в межах польової місії. Пізніше робота продовжилася безпосередньо в Ізраїлі: у 2025 році Sheba прийняла групу з <strong>7 українських лікарів</strong> на дворічну гуманітарну навчальну програму за напрямами гінекологія, невідкладна медицина, медицина травми, радіологія, ендокринологія, отоларингологія, медична симуляція та реабілітація.</p>
          <p>Мета такого співробітництва — не лише лікувати окремих пацієнтів, а й передавати українським медикам практичні знання, які залишаються в системі охорони здоров'я України.</p>
          <div class="photo-block">
            <!-- PHOTO RIGHTS TO BE CONFIRMED: photo of Ukrainian doctors' training group or delegation at Sheba not yet sourced -->
            <div class="photo-placeholder">Українські лікарі під час навчальної програми в Sheba<br>(фото буде додано після підтвердження прав використання)</div>
          </div>
        </div>
      </div>

      <div class="year-block" id="y2025">
        <div class="year-tag"><span class="num">2025</span><span class="label">Постійна присутність</span></div>
        <div class="year-body">
          <h3>2025: досвід медицини під час війни — для України</h3>
          <p>Група українських парламентарів, пов'язаних із питаннями охорони здоров'я, відвідала Sheba Medical Center. Під час візиту вивчали роботу лікарні під час ракетних атак, підготовку до масових надходжень постраждалих (mass casualty preparedness), швидку госпіталізацію, невідкладну медицину та безперервність роботи лікарні під час війни. <strong>Yoel Har-Even, Vice President of Global Affairs</strong>, представив українській делегації практичний досвід Sheba щодо роботи медичної системи під час атак і масових надходжень постраждалих. Під час візиту також обговорювалися перспективи реабілітації поранених українських військовослужбовців у Sheba — на рівні попередніх контактів.</p>

          <h3>2025: від мобільної клініки до постійного центру в Києві</h3>
          <p>Еволюція проєкту пройшла шлях від польової допомоги через мобільну медицину до постійної медичної інфраструктури. Sheba Medical Center і Благодійний фонд «Квітна» відкрили в Києві стаціонарний діагностичний центр жіночого здоров'я — оснащений сучасною системою УЗД, відеокольпоскопом, гінекологічним кріслом та іншим діагностичним обладнанням. У центрі працюють два лікарі, а потенційна пропускна спроможність становить 500–600 жінок на місяць. Усі обстеження безоплатні, з особливою увагою до військовослужбовиць, ветеранок, вдів загиблих, внутрішньо переміщених жінок та жінок у складних життєвих обставинах.</p>

          <h3>Від польового госпіталю у 2022-му — до Києва у 2025-му</h3>
          <p>У 2025 році Йоел Хар-Евен знову приїхав в Україну — цього разу для розвитку постійного проєкту жіночого здоров'я в Києві. Віцепрезидент Sheba Medical Center особисто працював разом з українськими лікарями та брав участь у діагностичних процедурах, перетворюючи партнерство на практичний обмін клінічним досвідом.</p>
          <div class="photo-block">
            <!-- PHOTO RIGHTS TO BE CONFIRMED: photo of Yoel Har-Even with Ukrainian doctors at the Kyiv diagnostic center (2025) not yet sourced from a rights-cleared channel -->
            <div class="photo-placeholder">Yoel Har-Even разом з українськими лікарями у діагностичному центрі жіночого здоров'я в Києві, 2025 рік<br>(фото буде додано після підтвердження прав використання)</div>
          </div>

          <div class="quote-block">
            <p>«Ми хочемо поділитися цим досвідом з Україною».</p>
            <cite><strong>Yoel Har-Even</strong>Vice President of Global Affairs, Sheba Medical Center</cite>
          </div>
        </div>
      </div>

      <div class="year-block">
        <div class="year-tag"><span class="num">↓</span><span class="label">Підсумок</span></div>
        <div class="year-body">
          <h2>Від екстреної допомоги — до довгострокового партнерства</h2>
          <p>Історія Sheba в Україні почалася з необхідності діяти негайно. Польовий госпіталь, телемедицина та евакуація пацієнтів відповідали на кризу перших місяців війни. Але співпраця не завершилася разом із демонтажем госпіталю.</p>
          <p>Мобільна клініка, навчання українських лікарів, обмін досвідом та створення постійного діагностичного центру в Києві показують інший етап — довгострокову присутність знань, технологій та медичної експертизи Sheba в Україні.</p>
        </div>
      </div>

    </div>
  </section>

  <section class="section support-section section-alt" id="segodni">
    <div class="container">
      <h2>Сьогодні зв'язок із Sheba Medical Center в Україні продовжується</h2>
      <div class="support-body">
        <p>MEDHUB є авторизованим представником Sheba Medical Center в Україні та допомагає українським пацієнтам організувати звернення до медичного центру в Ізраїлі.</p>
      </div>
      <div class="hero-actions">
        <a href="/kontakty/" class="btn btn-pink">Отримати консультацію
          <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </a>
        <a href="/kontakty/#contact-form" class="btn btn-outline">Надіслати медичні документи
          <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2315FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <p class="section-lead">Дізнайтеся більше: <a href="/sheba-medical-center/" class="text-link">Sheba Medical Center →</a> · <a href="/sheba-ukraine/" class="text-link">Представник Sheba в Україні →</a> · <a href="/napriamy-likuvannia/" class="text-link">Напрями лікування →</a> · <a href="/likari/" class="text-link">Лікарі →</a> · <a href="/kontakty/" class="text-link">Контакти →</a></p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container sources-block">
      <h2>Джерела та матеріали</h2>
      <ol>
        <li>Levy, G. et al. "The National Israeli Field Hospital in Ukraine: Innovative adaptation to a unique scenario." <em>Prehospital and Disaster Medicine</em> — статистика Kochav Meir (пацієнти, операції, телемедичні консультації, навчені українські медики). <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9574159/" target="_blank" rel="noopener noreferrer">pmc.ncbi.nlm.nih.gov/articles/PMC9574159</a></li>
        <li>Sheba Global. "Helping Ukraine in 2022: Sheba's New Field Hospital" — роль Sheba, Міністерства охорони здоров'я та закордонних справ Ізраїлю, цитата Yoel Har-Even. <a href="https://sheba-global.com/fieldhospitalukraine/" target="_blank" rel="noopener noreferrer">sheba-global.com/fieldhospitalukraine</a></li>
        <li>shebaonline.org. "Sheba's 'Shining Star' Field Hospital Has Begun Receiving Patients in Western Ukraine" — деталі місії, ролі Yoel Har-Even та Prof. Elhanan Bar-On. <a href="https://www.shebaonline.org/shebas-shining-star-field-hospital-has-begun-receiving-patients-in-western-ukraine/" target="_blank" rel="noopener noreferrer">shebaonline.org</a></li>
        <li>eJewishPhilanthropy / American Friends of Sheba. "A Jewish-funded mobile clinic in Ukraine will focus on women's health" — історія зустрічі Har-Even та Oran Singer в аеропорту Кракова, участь Corridor і «Квітна», фінансування трейлера. <a href="https://ejewishphilanthropy.com/a-jewish-funded-mobile-clinic-in-ukraine-will-focus-on-womens-health/" target="_blank" rel="noopener noreferrer">ejewishphilanthropy.com</a></li>
        <li>Благодійний фонд «Квітна» — мобільна медична платформа, фото пересувної клініки. <a href="https://kvitna.org.ua/mobile-medical-platform-in-ukraine/" target="_blank" rel="noopener noreferrer">kvitna.org.ua</a></li>
      </ol>
    </div>
  </section>
`,
});

// ===== 404 =============================================================
pages.push({
  slug: '',
  outPath: '404.html',
  title: 'Сторінку не знайдено | MEDHUB',
  description: 'Сторінку не знайдено.',
  canonicalPath: '/404.html',
  schema: ORG_SCHEMA_BASE,
  mainHtml: `  <section class="section" style="padding-top:100px;padding-bottom:100px;text-align:center;">
    <div class="container">
      <h1 style="color:var(--color-pink);text-transform:none;">Сторінку не знайдено</h1>
      <p style="font-size:1.05rem;max-width:60ch;margin:16px auto 32px;">Можливо, посилання застаріло. Скористайтеся навігацією вгорі або перейдіть на головну сторінку.</p>
      <a href="/" class="btn btn-pink">На головну
        <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      </a>
    </div>
  </section>
`,
});

// ---------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------

const root = __dirname;
let written = 0;

for (const page of pages) {
  const html = renderPage(page);
  const outFile = path.join(root, page.outPath);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');
  written += 1;
  console.log('wrote', page.outPath);
}

// sitemap.xml — every real page except the 404 fallback.
const sitemapUrls = pages
  .filter((p) => p.slug !== '')
  .map((p) => `  <url><loc>${SITE_URL}${p.canonicalPath}</loc></url>`)
  .join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap, 'utf8');
console.log('wrote sitemap.xml');

console.log(`\n${written} pages built.`);
