(function () {
  'use strict';

  var isEn = document.documentElement.lang === 'en';
  var i18n = isEn
    ? { openMenu: 'Open menu', closeMenu: 'Close menu', noFile: 'No file chosen', filesSelected: ' files selected' }
    : { openMenu: 'Відкрити меню', closeMenu: 'Закрити меню', noFile: 'Файл не обрано', filesSelected: ' файлів обрано' };

  // Mobile navigation toggle
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav-mobile');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? i18n.closeMenu : i18n.openMenu);
    });

    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', i18n.openMenu);
      });
    });
  }

  // Desktop "Лікування" nav dropdown — mouse hover and click/keyboard both
  // open it, both kept in sync with aria-expanded for screen readers.
  // (Mobile uses a separate, always-expanded ".nav-group" list — no JS needed there.)
  document.querySelectorAll('.nav-dropdown').forEach(function (dropdown) {
    var toggle = dropdown.querySelector('.nav-dropdown-toggle');
    var menu = dropdown.querySelector('.nav-dropdown-menu');
    if (!toggle || !menu) return;

    function open() {
      dropdown.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    function close() {
      dropdown.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    dropdown.addEventListener('mouseenter', open);
    dropdown.addEventListener('mouseleave', close);

    toggle.addEventListener('click', function () {
      if (dropdown.classList.contains('is-open')) {
        close();
      } else {
        open();
      }
    });

    dropdown.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        close();
        toggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!dropdown.contains(event.target)) {
        close();
      }
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', close);
    });
  });

  // /likari/ specialty filter — pure show/hide via the [hidden] attribute;
  // every physician card is already in the static HTML (server-rendered by
  // build.js), so search engines see the full catalog regardless of JS.
  var physicianFilters = document.querySelector('.physician-filters');
  var physicianCards = document.querySelectorAll('.physician-card');
  if (physicianFilters && physicianCards.length) {
    physicianFilters.addEventListener('click', function (event) {
      var button = event.target.closest('.physician-filter');
      if (!button) return;
      physicianFilters.querySelectorAll('.physician-filter').forEach(function (b) {
        var active = b === button;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      var filter = button.getAttribute('data-filter');
      physicianCards.forEach(function (card) {
        var specialties = (card.getAttribute('data-specialty') || '').split(' ');
        card.hidden = filter !== 'all' && specialties.indexOf(filter) === -1;
      });
    });
  }

  // File input hint
  var documentsInput = document.getElementById('documents');
  var fileHint = document.getElementById('file-hint');

  if (documentsInput && fileHint) {
    documentsInput.addEventListener('change', function () {
      var count = documentsInput.files ? documentsInput.files.length : 0;
      if (count === 0) {
        fileHint.textContent = i18n.noFile;
      } else if (count === 1) {
        fileHint.textContent = documentsInput.files[0].name;
      } else {
        fileHint.textContent = count + i18n.filesSelected;
      }
    });
  }

  // Consultation form — real submission to the Worker's /api/contact
  // endpoint. Success is shown only after the backend confirms it (2xx AND
  // a non-"error" status in the JSON body) — never optimistically.
  var form = document.getElementById('consultation-form');
  var statusSuccess = document.getElementById('form-status-success');
  var statusPartial = document.getElementById('form-status-partial');
  var statusError = document.getElementById('form-status-error');

  if (form && statusSuccess && statusPartial && statusError) {
    var renderedAtField = form.querySelector('.form-rendered-at');
    if (renderedAtField) {
      renderedAtField.value = String(Date.now());
    }

    var submitBtn = form.querySelector('.form-submit');

    function showStatus(el) {
      statusSuccess.hidden = el !== statusSuccess;
      statusPartial.hidden = el !== statusPartial;
      statusError.hidden = el !== statusError;
      el.hidden = false;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      fetch('/api/contact', { method: 'POST', body: new FormData(form) })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data.status !== 'error') {
            form.querySelectorAll('input, textarea, button').forEach(function (el) {
              el.disabled = true;
            });
            showStatus(result.data.status === 'ok_partial' ? statusPartial : statusSuccess);
          } else {
            if (submitBtn) submitBtn.disabled = false;
            showStatus(statusError);
          }
        })
        .catch(function () {
          if (submitBtn) submitBtn.disabled = false;
          showStatus(statusError);
        });
    });
  }

  // Footer year
  var yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
