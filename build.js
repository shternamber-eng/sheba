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

function navList(activeSlug) {
  return NAV.map((item) => {
    const current = item.slug === activeSlug;
    return `        <li${current ? ' class="is-current"' : ''}><a href="${item.href}"${current ? ' aria-current="page"' : ''}>${item.label}</a></li>`;
  }).join('\n');
}

// ---------------------------------------------------------------------
// Header / footer / contact-form partials (JS template functions —
// the one place to edit chrome shared by every page).
// ---------------------------------------------------------------------

function renderHeader(activeSlug) {
  return `<header class="site-header" id="site-header">

  <div class="top-bar">
    <div class="top-bar-inner">
      <a href="/likari/">Лікарі Sheba</a>
      <a href="/napriamy-likuvannia/">Напрями лікування</a>
      <a href="/kontakty/">Контакти</a>
      <a href="/kontakty/" class="top-bar-cta">Отримати консультацію
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </div>
  </div>

  <div class="header-mid">
    <div class="container header-mid-inner">
      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="main-nav-mobile" aria-label="Відкрити меню">
        <span></span><span></span><span></span>
      </button>

      <a href="/" class="logo" aria-label="MEDHUB — на головну">
        ${MEDHUB_MARK_SVG}
        <span class="logo-text">
          <span class="logo-name-row">
            <span class="logo-name">MEDHUB</span>
          </span>
          <span class="logo-sub">${REP_LINE}</span>
        </span>
      </a>

      <a href="/kontakty/" class="mobile-search-icon" aria-label="Контакти">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </a>

      <div class="header-shortcuts">
        <a class="header-shortcut" href="/napriamy-likuvannia/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27S4 20 4 12a6 6 0 0111-3 6 6 0 0111 3c0 8-10 15-10 15z" stroke="#0068FF" stroke-width="2" stroke-linejoin="round"/><path d="M9 12h4l2-3 3 6 2-3h3" stroke="#2315FF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Напрями лікування</span>
        </a>
        <a class="header-shortcut" href="/likari/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="10" r="5" stroke="#0068FF" stroke-width="2"/><path d="M6 27c1.5-6 6-9 10-9s8.5 3 10 9" stroke="#2315FF" stroke-width="2" stroke-linecap="round"/></svg>
          <span>Лікарі Sheba</span>
        </a>
        <a class="header-shortcut" href="/sheba-medical-center/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="7" y="9" width="18" height="17" rx="2" stroke="#0068FF" stroke-width="2"/><path d="M12 14h3M17 14h3M12 18h3M17 18h3" stroke="#2315FF" stroke-width="1.6" stroke-linecap="round"/></svg>
          <span>Sheba Medical Center</span>
        </a>
        <a class="header-shortcut header-shortcut--search" href="/kontakty/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="14" cy="14" r="9" stroke="#2315FF" stroke-width="2"/><path d="M27 27l-6-6" stroke="#2315FF" stroke-width="2" stroke-linecap="round"/></svg>
          <span>Контакти</span>
        </a>
      </div>
    </div>
  </div>

  <nav class="main-nav" id="main-nav" aria-label="Основна навігація">
    <div class="container">
      <ul>
${navList(activeSlug)}
      </ul>
    </div>
  </nav>

  <nav class="main-nav-mobile" id="main-nav-mobile" aria-label="Мобільна навігація">
    <ul>
${navList(activeSlug)}
    </ul>
  </nav>
</header>`;
}

function renderFooter() {
  return `<footer class="site-footer" id="contacts">
  <div class="container footer-top">
    <a href="/" class="logo">
      ${MEDHUB_MARK_SVG}
      <span class="logo-text">
        <span class="logo-name-row">
          <span class="logo-name">MEDHUB</span>
        </span>
        <span class="logo-sub">${REP_LINE}</span>
      </span>
    </a>

    <div class="footer-contact">
      <a class="footer-fb" href="#" aria-label="Facebook MEDHUB">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 8.5h2V5.2c-.35-.05-1.55-.2-2.95-.2-2.92 0-4.92 1.83-4.92 5.2V13H6v3.7h3.13V24h3.7v-7.3h3l.5-3.7h-3.5V10.6c0-1.07.29-1.8 1.87-1.8z" fill="#fff"/></svg>
      </a>
      <a class="footer-phone" href="tel:+380674067357">+380 67 406 73 57</a>
      <span class="footer-contact-title">Зв'яжіться з MEDHUB в Україні</span>
    </div>
  </div>

  <div class="container footer-grid">
    <div class="footer-col">
      <h2>MEDHUB</h2>
      <ul>
        <li><a href="/pro-medhub/">Про MEDHUB</a></li>
        <li><a href="/sheba-medical-center/">Sheba Medical Center</a></li>
        <li><a href="/napriamy-likuvannia/">Напрями лікування</a></li>
        <li><a href="/likari/">Лікарі Sheba</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h2>Пацієнтам</h2>
      <ul>
        <li><a href="/patsiientam/">Як звернутися</a></li>
        <li><a href="/kontakty/#contact-form">Надіслати документи</a></li>
        <li><a href="/patsiientam/#faq">Часті запитання</a></li>
        <li><a href="/kontakty/">Контакти</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h2>Контакти MEDHUB</h2>
      <ul>
        <li><a href="tel:+380674067357">Телефон: +380 67 406 73 57 (українська мова)</a></li>
        <li><a href="https://wa.me/380674067357">WhatsApp: +380 67 406 73 57 (українська мова)</a></li>
        <li><a href="mailto:info@medhub.group">Email: info@medhub.group</a></li>
      </ul>
    </div>
  </div>

  <div class="container footer-disclosure">
    <p>${LEGAL_DISCLOSURE}</p>
  </div>

  <div class="footer-bottom">
    <div class="container footer-bottom-inner">
      <p>&copy; <span id="footer-year"></span> MEDHUB. Усі права захищені.</p>
      <div class="footer-legal">
        <a href="#">Політика конфіденційності</a>
        <a href="#">Умови використання</a>
      </div>
    </div>
  </div>
</footer>`;
}

function renderConsultationForm() {
  return `      <form id="consultation-form" class="consultation-form" novalidate>
        <div class="form-row">
          <label for="full-name">Ім'я та прізвище</label>
          <input type="text" id="full-name" name="full-name" autocomplete="name" required>
        </div>

        <div class="form-row form-row--split">
          <div>
            <label for="phone">Телефон</label>
            <input type="tel" id="phone" name="phone" autocomplete="tel" required>
          </div>
          <div>
            <label for="email">Email</label>
            <input type="email" id="email" name="email" autocomplete="email" required>
          </div>
        </div>

        <div class="form-row">
          <label for="country">Країна</label>
          <input type="text" id="country" name="country" autocomplete="country-name" required>
        </div>

        <div class="form-row">
          <label for="message">Короткий опис медичного питання</label>
          <textarea id="message" name="message" rows="4"></textarea>
        </div>

        <div class="form-row">
          <label for="documents">Завантажити медичні документи</label>
          <input type="file" id="documents" name="documents" multiple>
          <p class="field-hint" id="file-hint">Файл не обрано</p>
        </div>

        <div class="form-row form-row--checkbox">
          <input type="checkbox" id="consent" name="consent" required>
          <label for="consent">Я погоджуюся на обробку персональних даних та медичної інформації з метою організації консультації.</label>
        </div>

        <button type="submit" class="btn btn-pink btn-plain form-submit">Надіслати запит</button>

        <p class="form-status" id="form-status" role="status" aria-live="polite" hidden>
          Дякуємо. Ваш запит отримано командою MEDHUB. Наш координатор зв'яжеться з вами.
        </p>
      </form>`;
}

// ---------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------

function renderPage({ slug, title, description, canonicalPath, mainHtml, schema }) {
  const canonical = SITE_URL + canonicalPath;
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${SITE_URL}/assets/brand/medhub-logo.png">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="uk_UA">

<!-- Favicon: MEDHUB mark (logo variant a2) -->
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/css/style.css">

${(Array.isArray(schema) ? schema : [schema]).map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
</head>
<body>
<a class="skip-link" href="#main-content">Перейти до основного вмісту</a>

${renderHeader(slug)}

<main id="main-content">
${mainHtml}
</main>

${renderFooter()}

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
        <img src="${image}" alt="${imageAlt}" loading="lazy">
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
        <p>Офіційний супровід пацієнтів з України — від передачі медичних документів та консультації до організації діагностики і лікування в Ізраїлі.</p>
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
        <h2><strong>Ваш зв'язок</strong> із Sheba Medical Center в Україні</h2>
        <p class="section-lead">MEDHUB забезпечує організаційну координацію українських пацієнтів, які звертаються за консультацією, діагностикою або лікуванням у Sheba Medical Center.</p>
        <div class="advantage-item">
          <h3><strong>Прийом</strong> медичних документів</h3>
          <p>Приймаємо виписки, знімки та результати досліджень і готуємо їх до передачі профільному спеціалісту.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Координація</strong> запиту</h3>
          <p>Первинно опрацьовуємо звернення та визначаємо, до якого напряму Sheba Medical Center він відноситься.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Організація</strong> консультації</h3>
          <p>Передаємо медичну інформацію фахівцям Sheba та допомагаємо з програмою обстеження.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Супровід</strong> до поїздки та комунікація</h3>
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
          <p>Україна, Київ (адресу буде уточнено)</p>
        </div>
      </div>

      <!-- TEMP placeholder map: MEDHUB's Ukraine office address is not yet finalized (see contact-info-item above), so this shows Sheba Medical Center's Israel location for reference only. Replace with a map of MEDHUB's actual Ukraine office once that address is confirmed. -->
      <div class="contact-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=34.8215%2C32.0295%2C34.8635%2C32.0515&amp;layer=mapnik&amp;marker=32.0407%2C34.8425" title="Sheba Medical Center, Ізраїль — довідково" loading="lazy"></iframe>
      </div>
      <p class="map-caption">Карта показує розташування Sheba Medical Center в Ізраїлі (довідково). Адресу представництва MEDHUB в Україні буде додано окремо.</p>
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
