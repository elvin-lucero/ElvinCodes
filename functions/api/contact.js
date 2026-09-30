/*
 * Contact form handler — Cloudflare Pages Function.
 *
 * Pages routes this file to /api/contact by its path under functions/, so the
 * form posts there directly. Works with or without JavaScript:
 *
 *   - JS on:  scripts/main.js posts here with fetch and reads the JSON reply.
 *   - JS off: the browser posts the form natively and follows the redirect to
 *             /thanks.html, or lands on a plain error page.
 *
 * Environment variables (Cloudflare dashboard → Workers & Pages → the project
 * → Settings → Variables and Secrets). Set them for Production *and* Preview,
 * or the deploy previews will report the form as misconfigured:
 *
 *   RESEND_API_KEY  required — the Resend API key, stored as a Secret
 *   CONTACT_TO      required — where messages should be delivered
 *   CONTACT_FROM    optional — verified sender; falls back to Resend's sandbox
 *                              address, which can only deliver to the account
 *                              owner, so set it once the domain is verified
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const LIMITS = { name: 100, email: 254, message: 5000 };

const wantsJson = (request) =>
  (request.headers.get("accept") || "").includes("application/json");

/** Minimal, dependency-free sanity check — real validation is the reply bouncing. */
const looksLikeEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= LIMITS.email;

const escapeHtml = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

/** Plain styled page for the no-JS failure path, so nobody sees a raw 500. */
const errorPage = (message) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Message not sent | ElvinCodes</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:#17181d; color:#f2f3d9; padding:24px;
         font:16px/1.6 "Raleway", system-ui, sans-serif; }
  .card { max-width:34rem; text-align:center; }
  h1 { font-size:clamp(22px,4vw,30px); margin:0 0 12px; letter-spacing:-0.01em; }
  p { color:rgba(242,243,217,.68); margin:0 0 20px; }
  a.btn { display:inline-block; padding:12px 22px; border-radius:999px;
          background:#7c8cf0; color:#fff; text-decoration:none; font-weight:600; }
  a.mail { color:#a6b1e1; }
</style></head>
<body><div class="card">
  <h1>That didn't send.</h1>
  <p>${escapeHtml(message)}</p>
  <p>You can reach me directly at
     <a class="mail" href="mailto:hello@elvincodes.com">hello@elvincodes.com</a>.</p>
  <a class="btn" href="/#contacts">Back to the form</a>
</div></body></html>`;

const fail = (request, status, message) =>
  wantsJson(request)
    ? Response.json({ ok: false, error: message }, { status })
    : new Response(errorPage(message), {
        status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });

const succeed = (request) =>
  wantsJson(request)
    ? Response.json({ ok: true })
    : // 303 so the browser re-issues as GET and a refresh cannot resubmit
      new Response(null, { status: 303, headers: { location: "/thanks.html" } });

/*
 * A single onRequest handler rather than onRequestPost plus a catch-all:
 * exporting both leaves it ambiguous which one Pages runs for a POST.
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return fail(request, 405, "This endpoint only accepts form submissions.");
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(request, 400, "That submission couldn't be read.");
  }

  const field = (key) => (form.get(key) || "").toString().trim();

  // Honeypot: bots fill the hidden field. Report success so they do not retry,
  // but send nothing.
  if (field("bot-field")) return succeed(request);

  const name = field("name");
  const email = field("email");
  const phone = field("phone");
  const message = field("message");

  if (!name || !email || !message) {
    return fail(request, 400, "Please fill in your name, email and message.");
  }
  if (!looksLikeEmail(email)) {
    return fail(request, 400, "That email address doesn't look right.");
  }
  if (name.length > LIMITS.name || message.length > LIMITS.message) {
    return fail(request, 400, "That message is longer than this form accepts.");
  }

  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM || "ElvinCodes <onboarding@resend.dev>";

  if (!apiKey || !to) {
    // Configuration problem, not the visitor's fault — say so without detail.
    console.error("contact: missing RESEND_API_KEY or CONTACT_TO");
    return fail(request, 500, "The form isn't configured correctly right now.");
  }

  let res;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: [email],
        subject: "[ElvinCodes] New contact form submission",
        text: [
          `Name:  ${name}`,
          `Email: ${email}`,
          ...(phone ? [`Phone: ${phone}`] : []),
          "",
          message,
          "",
          "—",
          "Sent from the contact form on elvincodes.com",
        ].join("\n"),
      }),
    });
  } catch (err) {
    console.error("contact: request to Resend failed", err);
    return fail(request, 502, "Couldn't reach the mail service. Please try again.");
  }

  if (!res.ok) {
    console.error("contact: Resend returned", res.status, await res.text());
    return fail(request, 502, "The mail service rejected that. Please try again.");
  }

  return succeed(request);
}
