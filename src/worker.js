/**
 * MEDHUB Worker — serves the static site (via env.ASSETS) and handles
 * POST /api/contact, the shared backend for every consultation form on the
 * site (/kontakty/, /sheba-ukraine/, /en/contacts/, ...).
 *
 * Required secret (never committed, set via `npx wrangler secret put`):
 *   RESEND_API_KEY       - from resend.com
 * Optional secrets:
 *   RESEND_FROM           - defaults to a Resend sandbox sender until the
 *                           medhub.group domain is verified in Resend; set
 *                           to 'MEDHUB <forms@medhub.group>' once it is.
 *   TURNSTILE_SECRET_KEY  - if unset, falls back to a honeypot field alone
 *                           (see verifyNotSpam) — never a timing heuristic,
 *                           which false-positived on real visitors.
 *
 * Notes on what this does NOT do, by design:
 *   - Never logs medical-document content or the message body — only
 *     high-level status codes / counts, so nothing sensitive lands in the
 *     Cloudflare dashboard's live log.
 *   - Never writes attachments to disk/KV/GitHub — they exist only in
 *     memory for the duration of the request, then get relayed to Resend
 *     and discarded.
 */

const RECIPIENT = 'cooklook770@gmail.com';
const DEFAULT_FROM = 'MEDHUB <onboarding@resend.dev>';
const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB raw (well under Resend's 40MB-after-base64 cap and typical inbox limits)
const ALLOWED_EXTENSIONS = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.dcm': 'application/dicom',
  '.dicom': 'application/dicom',
};
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return jsonResponse({ status: 'error', message: 'Method not allowed' }, 405);
      }
      try {
        return await handleContact(request, env);
      } catch (err) {
        console.error('contact handler failed:', err && err.message);
        return jsonResponse({ status: 'error', message: 'Internal error' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Invalid form submission' }, 400);
  }

  const field = (name) => (formData.get(name) || '').toString().trim();

  const fullName = field('full-name');
  const phone = field('phone');
  const email = field('email');
  const country = field('country');
  const message = field('message');
  const consent = field('consent');
  const sourcePage = field('source_page') || '/kontakty/';
  const honeypot = field('hp_website');
  const turnstileToken = field('cf-turnstile-response');

  // Honeypot tripped: pretend success so the bot doesn't learn to adapt,
  // but never actually send anything.
  if (honeypot) {
    return jsonResponse({ status: 'ok' }, 200);
  }

  if (!fullName || !phone || !email || !country || !consent) {
    return jsonResponse({ status: 'error', message: 'Missing required fields' }, 400);
  }

  const spamCheck = await verifyNotSpam({ env, turnstileToken, ip: request.headers.get('CF-Connecting-IP') });
  if (!spamCheck.ok) {
    return jsonResponse({ status: 'error', message: spamCheck.reason }, 400);
  }

  const { attachments, anyRejected } = await collectAttachments(formData);

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return jsonResponse({ status: 'error', message: 'Email service not configured' }, 500);
  }

  const submittedAt = new Date();
  const emailPayload = {
    from: env.RESEND_FROM || DEFAULT_FROM,
    to: [RECIPIENT],
    reply_to: email,
    subject: `MEDHUB — нове звернення: ${fullName}`,
    html: buildHtmlEmail({ fullName, phone, email, country, message, sourcePage, submittedAt, attachments, anyRejected }),
    text: buildTextEmail({ fullName, phone, email, country, message, sourcePage, submittedAt, attachments, anyRejected }),
  };
  if (attachments.length) {
    emailPayload.attachments = attachments.map((a) => ({ filename: a.filename, content: a.content, content_type: a.contentType }));
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resendRes.ok) {
    // Log status only — never the payload (it contains the patient's
    // message and reply-to email).
    console.error('Resend API error, status', resendRes.status);
    return jsonResponse({ status: 'error', message: 'Email send failed' }, 502);
  }

  return jsonResponse({ status: anyRejected ? 'ok_partial' : 'ok' }, 200);
}

async function verifyNotSpam({ env, turnstileToken, ip }) {
  if (env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) {
      return { ok: false, reason: 'Spam check missing' };
    }
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: ip || '' }),
    });
    const verifyData = await verifyRes.json().catch(() => ({ success: false }));
    return verifyData.success ? { ok: true } : { ok: false, reason: 'Spam check failed' };
  }

  // Fallback while Turnstile isn't configured: the honeypot field (checked
  // by the caller before this function even runs) is the only hard block.
  // A minimum-fill-time check used to run here too, but 3s of "must wait"
  // false-positived on real visitors — autofill, a form filled from a
  // second monitor, or just a fast typist — and rejected real inquiries
  // with a genuine 400. Never block a human to maybe catch a bot; wait for
  // Turnstile instead of guessing at a "safe" delay.
  return { ok: true };
}

async function collectAttachments(formData) {
  const files = formData.getAll('documents').filter((f) => f && typeof f === 'object' && 'size' in f && f.size > 0);
  let totalSize = 0;
  let anyRejected = false;
  const candidates = [];

  for (const file of files) {
    const name = file.name || 'file';
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
    const mime = ALLOWED_EXTENSIONS[ext];
    if (!mime) {
      anyRejected = true;
      continue;
    }
    totalSize += file.size;
    candidates.push({ file, filename: name, contentType: mime });
  }

  if (totalSize > MAX_TOTAL_ATTACHMENT_BYTES) {
    // Don't lose the inquiry over oversized files — send text-only and let
    // the frontend tell the patient to send documents another way.
    return { attachments: [], anyRejected: true };
  }

  const attachments = await Promise.all(candidates.map(async (c) => ({
    filename: c.filename,
    contentType: c.contentType,
    content: await fileToBase64(c.file),
  })));

  return { attachments, anyRejected };
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // avoid call-stack limits on String.fromCharCode(...bigArray)
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtmlEmail({ fullName, phone, email, country, message, sourcePage, submittedAt, attachments, anyRejected }) {
  const filesLine = attachments.length
    ? attachments.map((a) => escapeHtml(a.filename)).join(', ')
    : (anyRejected ? 'Немає (файли відхилено за форматом/розміром — див. нижче)' : 'Немає');
  const rejectedNote = anyRejected
    ? '<p style="margin:12px 0 0;color:#7A1E1E;font-size:13px;">Увага: частину файлів не додано (неприпустимий формат або перевищено ліміт розміру). Зв\'яжіться з пацієнтом, щоб отримати їх іншим способом.</p>'
    : '';

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F4F5F9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" style="background:#F4F5F9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr><td style="background:#2315FF;padding:20px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;">MEDHUB</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#0000C1;font-size:20px;">Нове звернення через ${escapeHtml(sourcePage)}</h2>
          <table role="presentation" width="100%" style="font-size:14px;color:#1a1a2e;border-collapse:collapse;">
            <tr><td style="padding:6px 0;width:120px;color:#6b7280;vertical-align:top;">Ім'я:</td><td style="padding:6px 0;">${escapeHtml(fullName)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Телефон:</td><td style="padding:6px 0;"><a href="tel:${escapeHtml(phone)}" style="color:#2315FF;">${escapeHtml(phone)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Email:</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#2315FF;">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Країна:</td><td style="padding:6px 0;">${escapeHtml(country)}</td></tr>
          </table>
          <h3 style="margin:24px 0 8px;color:#0000C1;font-size:15px;">Медичне питання</h3>
          <p style="margin:0;white-space:pre-wrap;font-size:14px;">${message ? escapeHtml(message) : '—'}</p>
          <h3 style="margin:24px 0 8px;color:#0000C1;font-size:15px;">Додані файли</h3>
          <p style="margin:0;font-size:14px;">${filesLine}</p>
          ${rejectedNote}
        </td></tr>
        <tr><td style="padding:16px 32px;background:#F4F5F9;font-size:12px;color:#9ca3af;">
          Джерело: medhub.group${escapeHtml(sourcePage)} · Надіслано ${submittedAt.toISOString()}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildTextEmail({ fullName, phone, email, country, message, sourcePage, submittedAt, attachments, anyRejected }) {
  const filesLine = attachments.length
    ? attachments.map((a) => a.filename).join(', ')
    : (anyRejected ? 'Немає (файли відхилено за форматом/розміром)' : 'Немає');

  return `Нове звернення через medhub.group${sourcePage}

Ім'я: ${fullName}
Телефон: ${phone}
Email: ${email}
Країна: ${country}

Медичне питання:
${message || '—'}

Додані файли: ${filesLine}
${anyRejected ? "\nУвага: частину файлів не додано (неприпустимий формат або перевищено ліміт розміру)." : ''}

Надіслано: ${submittedAt.toISOString()}`;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
