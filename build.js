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
        <li><a href="${directions}">${t.directionsLink}</a></li>
        <li><a href="${doctors}">${t.doctorsLink}</a></li>
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

function renderPage({ slug, lang = 'uk', title, description, canonicalPath, mainHtml, schema }) {
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

${renderHeader(slug, lang)}

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

  <section class="section" id="directions">
    <div class="container">
      <h2><strong>Напрями</strong> лікування</h2>
      <p class="section-lead">Лікування проводиться в Sheba Medical Center. MEDHUB організовує звернення за будь-яким із напрямів центру.</p>
      <div class="directions-grid directions-grid--compact">
        <div class="direction-card"><h3>Онкологія</h3><p>Діагностика та лікування онкологічних захворювань у дорослих і дітей.</p></div>
        <div class="direction-card"><h3>Кардіологія</h3><p>Діагностика та лікування захворювань серця і судин.</p></div>
        <div class="direction-card"><h3>Неврологія</h3><p>Діагностика та лікування захворювань нервової системи.</p></div>
        <div class="direction-card"><h3>Ортопедія</h3><p>Лікування захворювань і травм опорно-рухового апарату.</p></div>
        <div class="direction-card"><h3>Гематологія</h3><p>Діагностика та лікування захворювань крові й кровотворної системи.</p></div>
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
pages.push({
  slug: 'pro-medhub',
  outPath: 'pro-medhub/index.html',
  title: 'Про MEDHUB | Авторизований представник Sheba Medical Center в Україні',
  description: 'MEDHUB — авторизований представник Sheba Medical Center в Україні: координація звернень, супровід пацієнтів і комунікація з медичним центром в Ізраїлі.',
  canonicalPath: '/pro-medhub/',
  schema: MEDHUB_SCHEMA,
  mainHtml: `${titleBand('Про MEDHUB')}

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
pages.push({
  slug: 'sheba-medical-center',
  outPath: 'sheba-medical-center/index.html',
  title: 'Sheba Medical Center | MEDHUB — представник в Україні',
  description: 'Sheba Medical Center — один із провідних медичних центрів Ізраїлю: клінічні напрями, діагностика, лікування, дослідження. MEDHUB організовує звернення українських пацієнтів.',
  canonicalPath: '/sheba-medical-center/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA],
  mainHtml: `${titleBand('Sheba Medical Center')}

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
        <p>Онкологія, кардіологія, неврологія, ортопедія, гематологія, педіатрія, реабілітація, трансплантологія та інші напрями — детальний перелік і короткий опис кожного напряму зібрано на окремій сторінці.</p>
      </div>
      <a href="/napriamy-likuvannia/" class="text-link">Переглянути напрями лікування →</a>
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

// ===== 3. НАПРЯМИ ЛІКУВАННЯ (catalog) ===================================
const DIRECTIONS = [
  ['Онкологія', 'Діагностика та лікування онкологічних захворювань у дорослих і дітей, включно з хіміотерапією, променевою терапією та таргетною терапією.', 'onkologiya'],
  ['Кардіологія', 'Діагностика та лікування захворювань серця і судин, включно з інвазивною кардіологією та кардіохірургією.', 'kardiologiya'],
  ['Неврологія', 'Діагностика та лікування захворювань головного і спинного мозку, периферичної нервової системи.', 'nevrologiya'],
  ['Нейрохірургія', 'Хірургічне лікування захворювань і травм головного та спинного мозку.', 'neirokhirurgiya'],
  ['Ортопедія', 'Лікування захворювань і травм опорно-рухового апарату, ендопротезування суглобів.', 'ortopediya'],
  ['Гінекологія', 'Діагностика та лікування гінекологічних захворювань, включно з онкогінекологією.', 'ginekologiya'],
  ['Урологія', 'Діагностика та лікування захворювань сечостатевої системи.', 'urologiya'],
  ['Гематологія', 'Діагностика та лікування захворювань крові й кровотворної системи.', 'gematologiya'],
  ['Педіатрія', 'Діагностика та лікування дитячих захворювань, включно з дитячою онкологією та хірургією.', 'pediatriya'],
  ['Реабілітація', 'Реабілітаційні програми після інсульту, травм і хірургічних втручань.', 'reabilitatsiya'],
  ['Трансплантологія', 'Програми трансплантації органів і кісткового мозку.', 'transplantologiya'],
  ['Генетика', 'Генетична діагностика, консультування та супровід пацієнтів зі спадковими захворюваннями.', 'genetyka'],
];

pages.push({
  slug: 'napriamy-likuvannia',
  outPath: 'napriamy-likuvannia/index.html',
  title: 'Напрями лікування в Sheba Medical Center | MEDHUB',
  description: 'Напрями лікування в Sheba Medical Center: онкологія, кардіологія, неврологія, ортопедія, гематологія, педіатрія, реабілітація, трансплантологія та інші. MEDHUB організовує звернення українських пацієнтів.',
  canonicalPath: '/napriamy-likuvannia/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA],
  mainHtml: `${titleBand('Напрями лікування')}

  <section class="section page-intro">
    <div class="container">
      <p>Лікування за всіма напрямами нижче проводиться в Sheba Medical Center. MEDHUB, як представник центру в Україні, координує звернення пацієнта та передає медичні документи профільному підрозділу. Кожен напрям згодом отримає власну детальну сторінку.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="directions-grid">
${DIRECTIONS.map(([name, desc, slug]) => `        <!-- future page: /napriamy-likuvannia/${slug}/ -->
        <div class="direction-card">
          <h3>${name} в Sheba Medical Center</h3>
          <p>${desc}</p>
        </div>`).join('\n')}
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

// ===== 4. ЛІКАРІ (catalog, demo data) ===================================
const DOCTORS = [
  ['ЙБ', 'Д-р Йоав Барак', 'Кардіологія', 'Кардіологічний центр'],
  ['МК', 'Д-р Міріам Коен', 'Онкологія', 'Онкологічний центр'],
  ['ДЛ', 'Д-р Даніель Леві', 'Неврологія', 'Відділення неврології'],
  ['РА', 'Д-р Рут Авраам', 'Ортопедія', 'Відділення ортопедії'],
  ['ІШ', 'Д-р Ітай Шапіро', 'Гематологія', 'Відділення гематології'],
  ['НП', 'Д-р Ноа Перець', 'Педіатрія', 'Дитяча лікарня'],
];

pages.push({
  slug: 'likari',
  outPath: 'likari/index.html',
  title: 'Лікарі Sheba Medical Center | MEDHUB',
  description: 'Лікарі Sheba Medical Center за спеціальністю та відділенням. MEDHUB організовує консультацію з профільним спеціалістом для українських пацієнтів.',
  canonicalPath: '/likari/',
  schema: [MEDHUB_SCHEMA, SHEBA_SCHEMA],
  mainHtml: `${titleBand('Лікарі Sheba Medical Center')}

  <section class="section page-intro">
    <div class="container">
      <p>Координатор MEDHUB підбирає профільного спеціаліста Sheba Medical Center відповідно до медичного питання пацієнта. Нижче — приклад того, як буде виглядати каталог лікарів центру.</p>
      <p class="doctor-demo-note">Профілі нижче — демонстраційні заповнювачі (demo data). Реальні профілі лікарів Sheba Medical Center буде додано найближчим часом.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="doctor-grid">
${DOCTORS.map(([initials, name, specialty, dept]) => `        <div class="doctor-card">
          <div class="doctor-avatar" aria-hidden="true">${initials}</div>
          <h3>${name}</h3>
          <span class="doctor-specialty">${specialty}</span>
          <span class="doctor-dept">${dept}, Sheba Medical Center</span>
          <p class="doctor-desc">Профіль лікаря буде доповнено освітою, досвідом і напрямами практики.</p>
          <a href="/kontakty/" class="btn btn-outline btn-sm">Отримати консультацію цього спеціаліста
            <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2315FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна допомога',
  headingAccent: 'з підбором лікаря?',
  text: 'Надішліть медичні документи — координатор MEDHUB підбере профільного спеціаліста Sheba Medical Center.',
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

pages.push({
  slug: 'patsiientam',
  outPath: 'patsiientam/index.html',
  title: 'Пацієнтам | MEDHUB — представник Sheba Medical Center в Україні',
  description: 'Як звернутися до MEDHUB, які документи потрібні, як відбувається медична оцінка, підготовка до візиту в Sheba Medical Center та відповіді на часті запитання.',
  canonicalPath: '/patsiientam/',
  schema: MEDHUB_SCHEMA,
  mainHtml: `${titleBand('Пацієнтам')}

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
pages.push({
  slug: 'kontakty',
  outPath: 'kontakty/index.html',
  title: 'Контакти MEDHUB | Авторизований представник Sheba Medical Center в Україні',
  description: 'Контакти MEDHUB в Україні: телефон, WhatsApp, email, адреса, години роботи та форма для надсилання медичних документів.',
  canonicalPath: '/kontakty/',
  schema: MEDHUB_SCHEMA,
  mainHtml: `${titleBand('Контакти MEDHUB')}

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

      <!-- Approximate pin for Hotel Mir office building, Holosiivskyi Ave 70, Kyiv — verify exact coordinates before relying on this for navigation. -->
      <div class="contact-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=30.4788%2C50.3858%2C30.5208%2C50.4078&amp;layer=mapnik&amp;marker=50.3968%2C30.4998" title="Офіс MEDHUB, Голосіївський проспект 70, Київ" loading="lazy"></iframe>
      </div>
      <p class="map-caption">Голосіївський проспект, 70 (офісна будівля готелю «Мир»), Київ.</p>
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

// ===== EN 5. DOCTORS (catalog, demo data) ===============================
const DOCTORS_EN = [
  ['YB', 'Dr. Yoav Barak', 'Cardiology', 'Cardiology Center'],
  ['MC', 'Dr. Miriam Cohen', 'Oncology', 'Oncology Center'],
  ['DL', 'Dr. Daniel Levy', 'Neurology', 'Neurology Department'],
  ['RA', 'Dr. Ruth Avraham', 'Orthopedics', 'Orthopedics Department'],
  ['IS', 'Dr. Itai Shapiro', 'Hematology', 'Hematology Department'],
  ['NP', 'Dr. Noa Peretz', 'Pediatrics', "Children's Hospital"],
];

pages.push({
  slug: 'likari',
  lang: 'en',
  outPath: 'en/doctors/index.html',
  title: 'Sheba Medical Center Doctors | MEDHUB',
  description: 'Sheba Medical Center doctors by specialty and department. MEDHUB arranges a consultation with the right specialist for Ukrainian patients.',
  canonicalPath: '/en/doctors/',
  schema: [MEDHUB_SCHEMA_EN, SHEBA_SCHEMA],
  mainHtml: `${titleBand('Sheba Medical Center Doctors')}

  <section class="section page-intro">
    <div class="container">
      <p>A MEDHUB coordinator selects the right Sheba Medical Center specialist based on the patient's medical question. Below is an example of how the center's doctor directory will look.</p>
      <p class="doctor-demo-note">The profiles below are demo placeholders. Real Sheba Medical Center doctor profiles will be added soon.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="doctor-grid">
${DOCTORS_EN.map(([initials, name, specialty, dept]) => `        <div class="doctor-card">
          <div class="doctor-avatar" aria-hidden="true">${initials}</div>
          <h3>${name}</h3>
          <span class="doctor-specialty">${specialty}</span>
          <span class="doctor-dept">${dept}, Sheba Medical Center</span>
          <p class="doctor-desc">This doctor's profile will be supplemented with education, experience, and areas of practice.</p>
          <a href="/en/contacts/" class="btn btn-outline btn-sm">Request a Consultation with This Specialist
            <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2315FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Need help',
  headingAccent: 'choosing a doctor?',
  text: 'Send your medical documents — a MEDHUB coordinator will select the right Sheba Medical Center specialist.',
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

      <!-- Approximate pin for Hotel Mir office building, Holosiivskyi Ave 70, Kyiv — verify exact coordinates before relying on this for navigation. -->
      <div class="contact-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=30.4788%2C50.3858%2C30.5208%2C50.4078&amp;layer=mapnik&amp;marker=50.3968%2C30.4998" title="MEDHUB office, 70 Holosiivskyi Avenue, Kyiv" loading="lazy"></iframe>
      </div>
      <p class="map-caption">70 Holosiivskyi Avenue (Hotel Mir office building), Kyiv, Ukraine.</p>
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

console.log(`\n${written} pages built.`);
