(function () {
  'use strict';

  // Mobile navigation toggle
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav-mobile');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Закрити меню' : 'Відкрити меню');
    });

    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Відкрити меню');
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
        fileHint.textContent = 'Файл не обрано';
      } else if (count === 1) {
        fileHint.textContent = documentsInput.files[0].name;
      } else {
        fileHint.textContent = count + ' файлів обрано';
      }
    });
  }

  // Consultation form — demo mode (no backend connected yet).
  // Replace this handler with a real API/email/CRM integration.
  var form = document.getElementById('consultation-form');
  var status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      form.querySelectorAll('input, textarea, button').forEach(function (el) {
        el.disabled = true;
      });

      status.hidden = false;
      status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Footer year
  var yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
