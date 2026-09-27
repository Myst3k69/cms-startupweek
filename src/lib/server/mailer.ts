/**
 * Envoi d'emails — serveur uniquement.
 *
 * Fournisseur choisi selon l'environnement :
 *   • SMTP (recommandé, même boîte que n8n) : SMTP_HOST, SMTP_PORT (465 par défaut),
 *     SMTP_SECURE (déduit du port), SMTP_USER, SMTP_PASSWORD ;
 *   • sinon Resend : RESEND_API_KEY.
 * Communs : EMAIL_FROM (« StartupWeek <contact@startupweek.tech> »), EMAIL_REPLY_TO
 * (défaut : l'adresse de EMAIL_FROM), EMAIL_BCC (copie cachée, ex. pour garder une
 * trace dans une boîte ; plusieurs adresses séparées par des virgules).
 *
 * Mise en forme : le corps des modèles est du texte ; il est échappé puis rendu en
 * HTML sobre (paragraphes, listes « - », liens cliquables) avec un pied de page.
 */
import nodemailer, { type Transporter } from "nodemailer";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export type EmailSendResult = { ok: true; id?: string } | { ok: false; error: string };
export type EmailSender = (message: OutgoingEmail) => Promise<EmailSendResult>;

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Adresse seule d'un « Nom <adresse> ». */
export function addressOf(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  return (m ? m[1] : from).trim();
}

export function mailProvider(): "smtp" | "resend" | null {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

/** Vrai si un fournisseur ET un expéditeur sont configurés. */
export function isMailConfigured(): boolean {
  return mailProvider() !== null && Boolean(fromAddress());
}

function fromAddress(): string | undefined {
  return process.env.EMAIL_FROM || (mailProvider() === "smtp" ? process.env.SMTP_USER : undefined) || undefined;
}

let transport: Transporter | null = null;

function smtpTransport(): Transporter {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transport;
}

/** Expéditeur configuré (null si rien n'est configuré : les emails restent en file). */
export function createMailSender(): EmailSender | null {
  const provider = mailProvider();
  const from = fromAddress();
  if (!provider || !from) return null;
  const replyTo = process.env.EMAIL_REPLY_TO || addressOf(from);
  const bcc = list(process.env.EMAIL_BCC);
  // Pas de copie vers le destinataire lui-même (sinon il reçoit l'email deux fois).
  const copyFor = (to: string) => bcc.filter((b) => b.toLowerCase() !== to.trim().toLowerCase());

  if (provider === "smtp") {
    return async (message) => {
      const mail = {
        from,
        to: message.to,
        replyTo: message.replyTo ?? replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: message.headers,
      };
      try {
        const info = await smtpTransport().sendMail(mail);
        const rejected = ((info.rejected ?? []) as (string | { address: string })[]).map((r) => (typeof r === "string" ? r : r.address));
        if (rejected.some((r) => r.toLowerCase() === message.to.toLowerCase())) {
          return { ok: false, error: `Adresse refusée par le serveur SMTP : ${message.to}` };
        }
        // Copie (EMAIL_BCC) seulement une fois l'envoi accepté : même message (même Message-ID,
        // qu'une boîte recevant les deux dédoublonne), enveloppe vers la copie.
        const copyTo = copyFor(message.to);
        if (copyTo.length) {
          await smtpTransport()
            .sendMail({ ...mail, messageId: info.messageId, envelope: { from: addressOf(from), to: copyTo } })
            .catch((e: unknown) => console.warn(`[mailer] copie non envoyée : ${e instanceof Error ? e.message : String(e)}`));
        }
        return { ok: true, id: info.messageId };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    };
  }

  const apiKey = process.env.RESEND_API_KEY!;
  return async (message) => {
    const copyTo = copyFor(message.to);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.to],
          ...(copyTo.length ? { bcc: copyTo } : {}),
          reply_to: message.replyTo ?? replyTo,
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(message.headers ? { headers: message.headers } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
      const data = (await res.json()) as { id?: string };
      return { ok: true, id: data.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  };
}

/* ═════════════════════════════ Mise en forme ═════════════════════════════ */

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);

/** Liens http(s) et adresses email cliquables (sur du texte déjà échappé). */
function linkify(escaped: string): string {
  return escaped
    .replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)»]/g, (url) => `<a href="${url}" style="color:#4f46e5">${url}</a>`)
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)(?=[\s).,;:!?]|$)/g, (_, pre: string, mail: string) => `${pre}<a href="mailto:${mail}" style="color:#4f46e5">${mail}</a>`);
}

function paragraphHtml(block: string): string {
  const lines = block.split("\n");
  const out: string[] = [];
  let items: string[] = [];
  let text: string[] = [];
  const flushText = () => {
    if (text.length) out.push(`<p style="margin:0 0 14px">${text.map((l) => linkify(escapeHtml(l))).join("<br>")}</p>`);
    text = [];
  };
  const flushList = () => {
    if (items.length) out.push(`<ul style="margin:0 0 14px;padding-left:20px">${items.map((l) => `<li style="margin:0 0 4px">${linkify(escapeHtml(l))}</li>`).join("")}</ul>`);
    items = [];
  };
  for (const line of lines) {
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushText();
      items.push(bullet[1]);
    } else {
      flushList();
      text.push(line);
    }
  }
  flushText();
  flushList();
  return out.join("\n");
}

const TAGLINE = "StartupWeek — l'accélérateur pour transformer votre idée en startup viable";
const SOCIAL = [
  ["LinkedIn", "https://www.linkedin.com/showcase/startupweek-tech"],
  ["Instagram", "https://www.instagram.com/startupweektech/"],
  ["Facebook", "https://www.facebook.com/startupweektech/"],
] as const;

export interface RenderOptions {
  /** Lien de désinscription (emails marketing uniquement). */
  unsubscribeUrl?: string;
}

/** Corps texte → { text, html } prêts à envoyer (pied de page inclus). */
export function renderEmail(body: string, opts: RenderOptions = {}): { text: string; html: string } {
  const clean = body.replace(/\r\n/g, "\n").trim();
  const footerText = [
    "—",
    TAGLINE,
    "https://www.startupweek.tech",
    ...(opts.unsubscribeUrl ? [`Vous ne souhaitez plus recevoir ces emails ? Désinscription : ${opts.unsubscribeUrl}`] : []),
  ].join("\n");
  const htmlBody = clean.split(/\n{2,}/).map(paragraphHtml).join("\n");
  const social = SOCIAL.map(([label, url]) => `<a href="${url}" style="color:#6b7280">${label}</a>`).join(" · ");
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:8px 0 0">Vous ne souhaitez plus recevoir ces emails ? <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#6b7280">Se désinscrire</a></p>`
    : "";
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f6">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111827">
<div style="background:#ffffff;border-radius:12px;padding:28px 28px 14px;border:1px solid #e5e7eb">
<p style="margin:0 0 20px;font-size:17px;font-weight:700;color:#111827">🚀 StartupWeek</p>
${htmlBody}
</div>
<div style="padding:16px 8px 0;font-size:12px;line-height:1.5;color:#6b7280;text-align:center">
<p style="margin:0">${escapeHtml(TAGLINE)}</p>
<p style="margin:4px 0 0"><a href="https://www.startupweek.tech" style="color:#6b7280">startupweek.tech</a> · ${social}</p>
${unsubscribe}
</div>
</div>
</body></html>`;
  return { text: `${clean}\n\n${footerText}\n`, html };
}
