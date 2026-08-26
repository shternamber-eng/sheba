#!/usr/bin/env node
/**
 * Static site build script — no dependencies.
 *
 * Single source of truth for the header, footer and contact-form
 * markup shared across every page. Run `node build.js` after editing
 * anything in this file to regenerate the static HTML actually served
 * (index.html, pro-sheba/index.html, ...). The generated files are
 * what gets committed and deployed — this script does not run at
 * request time.
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://sheba.cooklook770.workers.dev';
const SITE_NAME = 'Sheba Medical Center';

// ---------------------------------------------------------------------
// Nav model — single place that defines the site's pages & URLs.
// ---------------------------------------------------------------------

const NAV = [
  { slug: 'home', href: '/', label: 'Головна' },
  { slug: 'pro-sheba', href: '/pro-sheba/', label: 'Про Sheba' },
  { slug: 'napriamy-likuvannia', href: '/napriamy-likuvannia/', label: 'Напрями лікування' },
  { slug: 'likari', href: '/likari/', label: 'Лікарі' },
  { slug: 'medychnyi-turyzm', href: '/medychnyi-turyzm/', label: 'Медичний туризм' },
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
      <a href="/likari/">Знайти лікаря</a>
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

      <a href="/" class="logo" aria-label="Sheba Medical Center — на головну">
        <svg class="logo-mark" width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <path d="M31 10c-5 0-9 4-9 9s-4 9-9 9" stroke="#2FB297" stroke-width="4" stroke-linecap="round"/>
          <path d="M11 32c5 0 9-4 9-9s4-9 9-9" stroke="#E6317D" stroke-width="4" stroke-linecap="round"/>
        </svg>
        <span class="logo-text">
          <span class="logo-name-row">
            <span class="logo-name">Sheba</span>
            <span class="logo-name"><em>Medical</em></span>
          </span>
          <span class="logo-sub">Міжнародний відділ пацієнтів</span>
        </span>
      </a>

      <a href="/kontakty/" class="mobile-search-icon" aria-label="Контакти">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </a>

      <div class="header-shortcuts">
        <a class="header-shortcut" href="/napriamy-likuvannia/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27S4 20 4 12a6 6 0 0111-3 6 6 0 0111 3c0 8-10 15-10 15z" stroke="#2FB297" stroke-width="2" stroke-linejoin="round"/><path d="M9 12h4l2-3 3 6 2-3h3" stroke="#E6317D" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Напрями лікування</span>
        </a>
        <a class="header-shortcut" href="/likari/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="10" r="5" stroke="#2FB297" stroke-width="2"/><path d="M6 27c1.5-6 6-9 10-9s8.5 3 10 9" stroke="#E6317D" stroke-width="2" stroke-linecap="round"/></svg>
          <span>Лікарі</span>
        </a>
        <a class="header-shortcut" href="/medychnyi-turyzm/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="7" y="9" width="18" height="17" rx="2" stroke="#2FB297" stroke-width="2"/><path d="M12 14h3M17 14h3M12 18h3M17 18h3" stroke="#E6317D" stroke-width="1.6" stroke-linecap="round"/></svg>
          <span>Медичний туризм</span>
        </a>
        <a class="header-shortcut header-shortcut--search" href="/kontakty/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="14" cy="14" r="9" stroke="#E6317D" stroke-width="2"/><path d="M27 27l-6-6" stroke="#E6317D" stroke-width="2" stroke-linecap="round"/></svg>
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
      <svg class="logo-mark" width="38" height="38" viewBox="0 0 42 42" fill="none" aria-hidden="true">
        <path d="M31 10c-5 0-9 4-9 9s-4 9-9 9" stroke="#2FB297" stroke-width="4" stroke-linecap="round"/>
        <path d="M11 32c5 0 9-4 9-9s4-9 9-9" stroke="#E6317D" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <span class="logo-text">
        <span class="logo-name-row">
          <span class="logo-name">Sheba</span>
          <span class="logo-name"><em>Medical</em></span>
        </span>
        <span class="logo-sub">Міжнародний відділ пацієнтів</span>
      </span>
    </a>

    <div class="footer-contact">
      <a class="footer-fb" href="#" aria-label="Facebook Sheba Medical Center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 8.5h2V5.2c-.35-.05-1.55-.2-2.95-.2-2.92 0-4.92 1.83-4.92 5.2V13H6v3.7h3.13V24h3.7v-7.3h3l.5-3.7h-3.5V10.6c0-1.07.29-1.8 1.87-1.8z" fill="#fff"/></svg>
      </a>
      <a class="footer-phone" href="tel:+380674067357">+380 67 406 73 57</a>
      <span class="footer-contact-title">Зв'яжіться з представником Sheba Medical Center в Україні</span>
    </div>
  </div>

  <div class="container footer-grid">
    <div class="footer-col">
      <h2>Sheba</h2>
      <ul>
        <li><a href="/pro-sheba/">Про медичний центр</a></li>
        <li><a href="/likari/">Лікарі</a></li>
        <li><a href="/napriamy-likuvannia/">Напрями лікування</a></li>
        <li><a href="/medychnyi-turyzm/">Медичний туризм</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h2>Пацієнтам</h2>
      <ul>
        <li><a href="/kontakty/">Як почати лікування</a></li>
        <li><a href="/kontakty/#contact-form">Надіслати документи</a></li>
        <li><a href="/kontakty/">Контакти</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h2>Контакти</h2>
      <ul>
        <li><a href="tel:+380674067357">Телефон: +380 67 406 73 57 (українська мова)</a></li>
        <li><a href="https://wa.me/380674067357">WhatsApp: +380 67 406 73 57 (українська мова)</a></li>
        <li><a href="mailto:international@sheba.example">Email: international@sheba.example</a></li>
      </ul>
    </div>
  </div>

  <div class="footer-bottom">
    <div class="container footer-bottom-inner">
      <p>&copy; <span id="footer-year"></span> Sheba Medical Center. Усі права захищені. Інформація на сайті має ознайомчий характер і не замінює консультацію лікаря.</p>
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
          Дякуємо. Ваш запит отримано. Наш координатор зв'яжеться з вами.
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
<meta property="og:image" content="${SITE_URL}/assets/og-cover.jpg">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="uk_UA">

<!-- Favicon (placeholder mark, replace with official Sheba favicon) -->
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/css/style.css">

<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
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

const ORG_SCHEMA_BASE = {
  '@context': 'https://schema.org',
  '@type': 'MedicalOrganization',
  name: SITE_NAME,
  url: SITE_URL,
  medicalSpecialty: ['Oncology', 'Cardiology', 'Neurology', 'Radiology'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Derech Sheba 2',
    addressLocality: 'Ramat Gan',
    addressCountry: 'IL',
  },
  telephone: '+380-67-406-73-57',
};

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
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2B2C6C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
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
  title: 'Sheba Medical Center | Міжнародний медичний центр в Ізраїлі',
  description: 'Sheba Medical Center — один із провідних багатопрофільних медичних центрів Ізраїлю. Напрями лікування, лікарі та організація діагностики і лікування для міжнародних пацієнтів.',
  canonicalPath: '/',
  schema: ORG_SCHEMA_BASE,
  mainHtml: `${titleBand('Sheba Medical Center — міжнародний медичний центр в Ізраїлі')}

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <h2><strong>Один із провідних медичних центрів</strong> Ізраїлю та Близького Сходу</h2>
        <p>Sheba Medical Center — багатопрофільний медичний центр з великою кількістю клінічних напрямів, від онкології та кардіології до трансплантології. Міжнародний відділ допомагає пацієнтам з інших країн організувати діагностику та лікування.</p>
        <div class="hero-actions">
          <a href="/pro-sheba/" class="btn btn-pink">Дізнатися про Sheba
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
          <a href="/kontakty/" class="btn btn-outline">Отримати консультацію
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#E6317D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/hero-staff.jpg" alt="Персонал Sheba Medical Center з пацієнтами" loading="lazy" width="760" height="310">
      </div>
    </div>
  </section>

  <section class="section" id="about">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <div class="advantage-item">
          <h3><strong>Багатопрофільний медичний</strong> центр</h3>
          <p>Десятки клінічних відділень під одним дахом — від онкології та кардіології до реабілітації та трансплантології.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Академічна</strong> лікарня</h3>
          <p>Sheba пов'язана з провідним університетським медичним факультетом і бере участь у клінічних дослідженнях.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Міжнародний відділ</strong> пацієнтів</h3>
          <p>Окрема команда координаторів супроводжує пацієнтів з інших країн на кожному етапі лікування.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Корпус Sheba Medical Center" loading="lazy" width="535" height="420">
      </div>
    </div>
  </section>

  <section class="section section-alt" id="directions">
    <div class="container">
      <h2><strong>Основні напрями</strong> лікування</h2>
      <p class="section-lead">Sheba об'єднує десятки клінічних відділень. Нижче — частина напрямів, з якими найчастіше звертаються міжнародні пацієнти.</p>
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

  <section class="section support-section" id="tourism">
    <div class="container">
      <h2><strong>Медичний туризм</strong> та міжнародні пацієнти</h2>
      <div class="support-body">
        <p>Пацієнти з інших країн звертаються до Sheba Medical Center за другою думкою, складною діагностикою або лікуванням, недоступним удома. Міжнародний відділ бере на себе організаційну частину — від перекладу медичних документів до супроводу під час перебування в Ізраїлі.</p>
      </div>
      <a href="/medychnyi-turyzm/" class="text-link">Детальніше про медичний туризм в Sheba →</a>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна консультація',
  headingAccent: 'щодо лікування в Sheba?',
  text: 'Sheba Medical Center надає сучасні персоналізовані медичні послуги для пацієнтів з усього світу.',
  emphasis: "Залиште заявку — координатор міжнародного відділу зв'яжеться з вами і підкаже наступні кроки.",
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Напрями лікування',
  secondaryHref: '/napriamy-likuvannia/',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}
`,
});

// ===== 2. PRO SHEBA =====================================================
pages.push({
  slug: 'pro-sheba',
  outPath: 'pro-sheba/index.html',
  title: 'Про Sheba Medical Center | Sheba Medical Center',
  description: 'Sheba Medical Center — історія, масштаб, клінічні напрями, дослідження та міжнародна діяльність одного з провідних медичних центрів Ізраїлю.',
  canonicalPath: '/pro-sheba/',
  schema: ORG_SCHEMA_BASE,
  mainHtml: `${titleBand('Про Sheba Medical Center')}

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
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
          <h3><strong>Дослідження</strong> та інновації</h3>
          <p>Sheba бере участь у клінічних дослідженнях і впроваджує нові методи діагностики та лікування.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Академічна</strong> база</h3>
          <p>Лікарі центру поєднують клінічну практику з викладанням і науковою роботою.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Міжнародна</strong> діяльність</h3>
          <p>Окремий відділ супроводжує пацієнтів, які приїжджають на лікування з інших країн.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/hero-staff.jpg" alt="Персонал Sheba Medical Center" loading="lazy" width="760" height="310">
      </div>
    </div>
  </section>

  <section class="section support-section">
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
  text: 'Sheba Medical Center надає сучасні персоналізовані медичні послуги для пацієнтів з усього світу.',
  emphasis: "Залиште заявку — координатор міжнародного відділу зв'яжеться з вами і підкаже наступні кроки.",
  primaryLabel: 'Отримати консультацію',
  primaryHref: '/kontakty/',
  secondaryLabel: 'Медичний туризм',
  secondaryHref: '/medychnyi-turyzm/',
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
  title: 'Напрями лікування | Sheba Medical Center',
  description: 'Каталог клінічних напрямів Sheba Medical Center: онкологія, кардіологія, неврологія, ортопедія, гематологія, педіатрія, реабілітація, трансплантологія та інші.',
  canonicalPath: '/napriamy-likuvannia/',
  schema: ORG_SCHEMA_BASE,
  mainHtml: `${titleBand('Напрями лікування')}

  <section class="section page-intro">
    <div class="container">
      <p>Sheba Medical Center об'єднує десятки клінічних відділень у межах одного кампусу. Нижче — основні напрями, з якими найчастіше звертаються міжнародні пацієнти. Кожен напрям згодом отримає власну детальну сторінку.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="directions-grid">
${DIRECTIONS.map(([name, desc, slug]) => `        <!-- future page: /napriamy-likuvannia/${slug}/ -->
        <div class="direction-card">
          <h3>${name}</h3>
          <p>${desc}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Не знайшли',
  headingAccent: 'потрібний напрям?',
  text: 'Опишіть медичне питання координатору міжнародного відділу — ми підкажемо, до якого відділення Sheba звернутися.',
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
  title: 'Лікарі Sheba Medical Center | Sheba Medical Center',
  description: 'Каталог лікарів Sheba Medical Center за спеціальністю та відділенням. Підбір профільного спеціаліста для міжнародних пацієнтів.',
  canonicalPath: '/likari/',
  schema: ORG_SCHEMA_BASE,
  mainHtml: `${titleBand('Лікарі')}

  <section class="section page-intro">
    <div class="container">
      <p>Координатор міжнародного відділу підбирає профільного спеціаліста відповідно до медичного питання пацієнта. Нижче — приклад того, як буде виглядати каталог лікарів Sheba Medical Center.</p>
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
          <span class="doctor-dept">${dept}</span>
          <p class="doctor-desc">Профіль лікаря буде доповнено освітою, досвідом і напрямами практики.</p>
          <a href="/kontakty/" class="btn btn-outline btn-sm">Докладніше
            <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#E6317D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна допомога',
  headingAccent: 'з підбором лікаря?',
  text: 'Надішліть медичні документи — координатор міжнародного відділу підбере профільного спеціаліста.',
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

// ===== 5. МЕДИЧНИЙ ТУРИЗМ (existing single-page content, moved as-is) ===
pages.push({
  slug: 'medychnyi-turyzm',
  outPath: 'medychnyi-turyzm/index.html',
  title: 'Медичний туризм в Ізраїлі | Sheba Medical Center',
  description: 'Організація діагностики та лікування в Sheba Medical Center для міжнародних пацієнтів. Консультації, підбір лікарів, діагностика та повний медичний супровід.',
  canonicalPath: '/medychnyi-turyzm/',
  schema: {
    ...ORG_SCHEMA_BASE,
    description: 'Sheba Medical Center приймає іноземних пацієнтів і забезпечує повний цикл організації діагностики та лікування в Ізраїлі.',
  },
  mainHtml: `${titleBand('Медичний туризм в Ізраїлі — Sheba Medical Center')}

  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <h2><strong>Комплексна організація діагностики та лікування</strong> в Sheba Medical Center для міжнародних пацієнтів</h2>
        <p>Sheba Medical Center приймає іноземних пацієнтів і забезпечує повний цикл організації діагностики та лікування в Ізраїлі.</p>
        <div class="hero-actions">
          <a href="#contact-form" class="btn btn-pink">Отримати консультацію
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
          <a href="#contact-form" class="btn btn-outline">Надіслати медичні документи
            <span class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#E6317D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
        </div>
      </div>
      <div class="hero-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/hero-staff.jpg" alt="Персонал Sheba Medical Center з пацієнтами" loading="lazy" width="760" height="310">
      </div>
    </div>
  </section>

  <section class="section" id="advantages">
    <div class="container advantages-inner">
      <div class="advantages-list">
        <div class="advantage-item">
          <h3><strong>Один із провідних медичних центрів</strong> Ізраїлю</h3>
          <p>Sheba Medical Center входить до провідних багатопрофільних клінік Близького Сходу та регулярно визнається одним із найкращих медичних закладів світу.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Доступ до сучасної</strong> діагностики та лікування</h3>
          <p>Центр використовує сучасне обладнання та актуальні протоколи лікування в кардіології, онкології, неврології та інших напрямах медицини.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Персональний медичний</strong> координатор</h3>
          <p>Кожному пацієнту призначається координатор, який супроводжує його на всіх етапах — від першого звернення до завершення лікування.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Допомога з організацією</strong> перебування в Ізраїлі</h3>
          <p>Міжнародний відділ допомагає з розміщенням, транспортом та іншими організаційними питаннями під час перебування в країні.</p>
        </div>
        <div class="advantage-item">
          <h3><strong>Супровід пацієнта</strong> на всіх етапах лікування</h3>
          <p>Переклад медичної документації, узгодження візитів до лікарів і підтримка протягом усього періоду лікування.</p>
        </div>
      </div>
      <div class="advantages-media">
        <!-- TEMP dev reference from shebaonline.ru — replace with a licensed Sheba Medical Center photo -->
        <img src="/assets/temp-dev-refs/advantages-building.jpg" alt="Корпус Sheba Medical Center" loading="lazy" width="535" height="420">
      </div>
    </div>
  </section>

  <section class="section support-section" id="patient-support">
    <div class="container">
      <h2><strong>Повний супровід</strong> міжнародного пацієнта</h2>
      <div class="support-body">
        <p>Міжнародний відділ Sheba Medical Center супроводжує пацієнта на кожному етапі — від першого звернення до завершення лікування. Команда допомагає:</p>
        <p>
          <span>отримати та проаналізувати медичні документи;</span>
          <span>підібрати профільного спеціаліста;</span>
          <span>сформувати попередній медичний план;</span>
          <span>організувати консультації та діагностику;</span>
          <span>скласти розклад візитів;</span>
          <span>забезпечити переклад;</span>
          <span>допомогти з організаційними питаннями;</span>
          <span>супроводжувати пацієнта в процесі лікування;</span>
          <span>отримати підсумкові медичні документи після лікування.</span>
        </p>
      </div>
    </div>
  </section>

${ctaBand({
  heading: 'Потрібна консультація',
  headingAccent: 'щодо лікування в Sheba?',
  text: 'Sheba Medical Center надає сучасні персоналізовані медичні послуги для пацієнтів з усього світу.',
  emphasis: 'Надішліть медичні документи, і команда міжнародного відділу допоможе визначити наступні кроки.',
  primaryLabel: 'Отримати консультацію',
  primaryHref: '#contact-form',
  secondaryLabel: 'Надіслати документи',
  secondaryHref: '#contact-form',
  image: '/assets/temp-dev-refs/cta-consultation.jpg',
  imageAlt: 'Консультація лікаря з пацієнтом',
})}

  <section class="section form-section" id="contact-form">
    <div class="container form-section-inner">
      <div class="form-intro">
        <h2>Надіслати запит на консультацію</h2>
        <p>Заповніть форму — координатор міжнародного відділу зв'яжеться з вами та підкаже наступні кроки.</p>
      </div>
${renderConsultationForm()}
    </div>
  </section>
`,
});

// ===== 6. КОНТАКТИ =======================================================
pages.push({
  slug: 'kontakty',
  outPath: 'kontakty/index.html',
  title: 'Контакти | Sheba Medical Center',
  description: 'Контакти міжнародного відділу Sheba Medical Center: телефон, WhatsApp, email, адреса та форма звернення для пацієнтів з України.',
  canonicalPath: '/kontakty/',
  schema: ORG_SCHEMA_BASE,
  mainHtml: `${titleBand('Контакти')}

  <section class="section page-intro">
    <div class="container">
      <p>Зв'яжіться з представником Sheba Medical Center в Україні будь-яким зручним способом, або залиште заявку у формі нижче — координатор міжнародного відділу зв'яжеться з вами.</p>
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
          <p><a href="mailto:international@sheba.example">international@sheba.example</a></p>
        </div>
        <div class="contact-info-item">
          <h3>Години роботи представника</h3>
          <p>Пн–Пт, 09:00–18:00 (за київським часом)</p>
        </div>
        <div class="contact-info-item">
          <h3>Адреса медичного центру</h3>
          <p>Derech Sheba 2, Ramat Gan, Ізраїль</p>
        </div>
      </div>

      <!-- TEMP: generic OpenStreetMap embed of the Ramat Gan / Tel HaShomer area, no API key required. Replace with the official map embed when available. -->
      <div class="contact-map">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=34.8215%2C32.0295%2C34.8635%2C32.0515&amp;layer=mapnik&amp;marker=32.0407%2C34.8425" title="Розташування Sheba Medical Center на карті" loading="lazy"></iframe>
      </div>
    </div>
  </section>

  <section class="section form-section" id="contact-form">
    <div class="container form-section-inner">
      <div class="form-intro">
        <h2>Надіслати запит на консультацію</h2>
        <p>Опишіть медичне питання та за потреби додайте медичні документи — координатор зв'яжеться з вами.</p>
      </div>
${renderConsultationForm()}
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
