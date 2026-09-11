/*
 * Contact form handler.
 *
 * Accepts the POST from the contact form, validates it, and sends the message
 * on to my inbox via the Resend API. Works with or without JavaScript:
 *
 *   - JS on:  scripts/main.js posts here with fetch and reads the JSON reply.
 *   - JS off: the browser posts the form natively and follows the redirect
 *             to /thanks.html, or lands on a plain error page.
 *
 * Environment variables (set in Netlify → Site configuration → Environment):
 *   RESEND_API_KEY  required — the Resend API key
 *   CONTACT_TO      required — where messages should be delivered
 *   CONTACT_FROM    optional — verified sender; defaults to Resend's sandbox
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const LIMITS = { name: 100, email: 254, message: 5000 };

const wantsJson = (req) =>
  (req.headers.get("accept") || "").includes("application/json");

/** Minimal, dependency-free sanity check — real validation is the reply bouncing. */
const looksLikeEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= LIMITS.email;

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) =>
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
     <a class="mail" href="mailto:elvinlucero35@gmail.com">elvinlucero35@gmail.com</a>.</p>
  <a class="btn" href="/#contacts">Back to the form</a>
</div></body></html>`;

const fail = (req, status, message) =>
  wantsJson(req)
    ? Response.json({ ok: false, error: message }, { status })
    : new Response(errorPage(message), {
        status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });

const succeed = (req) =>
  wantsJson(req)
    ? Response.json({ ok: true })
    : // 303 so the browser re-issues as GET and a refresh can't resubmit
      new Response(null, { status: 303, headers: { location: "/thanks.html" } });

export default async (req) => {
  if (req.method !== "POST") {
    return fail(req, 405, "This endpoint only accepts form submissions.");
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return fail(req, 400, "That submission couldn't be read.");
  }

  const field = (key) => (form.get(key) || "").toString().trim();

  // Honeypot: bots fill the hidden field. Report success so they don't retry,
  // but send nothing.
  if (field("bot-field")) return succeed(req);

  const name = field("name");
  const email = field("email");
  const message = field("message");

  if (!name || !email || !message) {
    return fail(req, 400, "Please fill in your name, email and message.");
  }
  if (!looksLikeEmail(email)) {
    return fail(req, 400, "That email address doesn't look right.");
  }
  if (
    name.length > LIMITS.name ||
    message.length > LIMITS.message
  ) {
    return fail(req, 400, "That message is longer than this form accepts.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM || "ElvinCodes <onboarding@resend.dev>";

  if (!apiKey || !to) {
    // Configuration problem, not the visitor's fault — say so without detail.
    console.error("contact: missing RESEND_API_KEY or CONTACT_TO");
    return fail(req, 500, "The form isn't configured correctly right now.");
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
        subject: `Portfolio enquiry from ${name}`,
        text: [
          `Name:  ${name}`,
          `Email: ${email}`,
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
    return fail(req, 502, "Couldn't reach the mail service. Please try again.");
  }

  if (!res.ok) {
    console.error("contact: Resend returned", res.status, await res.text());
    return fail(req, 502, "The mail service rejected that. Please try again.");
  }

  return succeed(req);
};

export const config = { path: "/api/contact" };
