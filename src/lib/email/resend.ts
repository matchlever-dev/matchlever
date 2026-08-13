import { Resend } from "resend";

import {
  createUnsubscribeToken,
  isEmailUnsubscribed,
  normalizeEmail,
} from "@/lib/email/unsubscribe";

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your-")) return null;
  return new Resend(apiKey);
}

export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getReferenceInviteUrl(token: string) {
  return `${getAppBaseUrl()}/reference/${token}`;
}

export function getCandidateOnboardingUrl() {
  return `${getAppBaseUrl()}/onboarding`;
}

export function getCandidateDashboardUrl() {
  return `${getAppBaseUrl()}/dashboard/candidate`;
}

/** Email CTA: login, then continue onboarding or open the candidate profile. */
export function getCandidateProfileReminderUrl(hasCandidateProfile: boolean) {
  const next = hasCandidateProfile ? "/dashboard/candidate" : "/onboarding";
  return `${getAppBaseUrl()}/login?next=${encodeURIComponent(next)}`;
}

function getFromEmail() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "MatchLever <onboarding@resend.dev>"
  );
}

function getUnsubscribePageUrl(email: string) {
  return `${getAppBaseUrl()}/unsubscribe?token=${encodeURIComponent(
    createUnsubscribeToken(email)
  )}`;
}

function getUnsubscribeApiUrl(email: string) {
  return `${getAppBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(
    createUnsubscribeToken(email)
  )}`;
}

function unsubscribeFooterHtml(unsubscribeUrl: string) {
  return `
        <p style="margin:28px 0 0;font-size:11px;line-height:1.5;color:#8A9099">
          This is an automated message from MatchLever.
          <a href="${unsubscribeUrl}" style="color:#5B616B;text-decoration:underline">Unsubscribe from automated MatchLever emails</a>.
        </p>`;
}

async function deliverAutomatedEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<
  | { skipped: true; reason: "unsubscribed"; demo: false; id?: undefined }
  | { skipped?: false; demo: true; id?: undefined }
  | { skipped?: false; demo: false; id?: string }
> {
  const to = normalizeEmail(args.to);
  if (await isEmailUnsubscribed(to)) {
    console.info("[resend skip unsubscribed]", { to, subject: args.subject });
    return { skipped: true, reason: "unsubscribed", demo: false };
  }

  const unsubscribeUrl = getUnsubscribePageUrl(to);
  const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#2A2D34">
        ${args.html}
        ${unsubscribeFooterHtml(unsubscribeUrl)}
      </div>
    `;
  const resend = getResendClient();

  if (!resend) {
    console.info("[resend demo]", {
      to,
      subject: args.subject,
      unsubscribeUrl,
    });
    return { demo: true };
  }

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to,
    subject: args.subject,
    html,
    headers: {
      "List-Unsubscribe": `<${getUnsubscribeApiUrl(to)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { demo: false, id: data?.id };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function referenceInviteSubject(
  candidateName: string,
  reminder = false
) {
  const name = oneLine(candidateName);
  const prefix = reminder ? "Reminder: please verify" : "Please verify";
  if (!name || name === "a MatchLever candidate") {
    return `${prefix} a MatchLever reference`;
  }
  return `${prefix} a MatchLever reference for ${name}`;
}

export async function sendReferenceInviteEmail(args: {
  to: string;
  candidateName: string;
  candidateTitle: string;
  token: string;
  reminder?: boolean;
}) {
  const inviteUrl = getReferenceInviteUrl(args.token);
  const onboardingUrl = getCandidateOnboardingUrl();
  const candidateName = oneLine(args.candidateName) || "a MatchLever candidate";
  const candidateTitle = oneLine(args.candidateTitle);
  const reminder = Boolean(args.reminder);
  const subject = referenceInviteSubject(candidateName, reminder);
  const nameHtml = escapeHtml(candidateName);
  const titleHtml = candidateTitle ? escapeHtml(candidateTitle) : "";
  const whoHtml =
    candidateName === "a MatchLever candidate"
      ? `a MatchLever candidate${titleHtml ? ` (<strong>${titleHtml}</strong>)` : ""}`
      : `<strong>${nameHtml}</strong>${titleHtml ? ` (${titleHtml})` : ""}`;
  const intro = reminder
    ? `This is a reminder to complete your reference for ${whoHtml}.`
    : `You've been asked to verify a reference for ${whoHtml}.`;

  const delivered = await deliverAutomatedEmail({
    to: args.to,
    subject,
    html: `
        <p>Hello,</p>
        <p>${intro}</p>
        <p>
          <a href="${inviteUrl}" style="background:#2B5B84;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block">
            Open verification link
          </a>
        </p>
        <p style="font-size:12px;color:#5B616B">Or paste this URL:<br/>${inviteUrl}</p>

        <hr style="border:none;border-top:1px solid #E5E2DC;margin:28px 0 20px" />

        <div style="background:#F7F6F3;border:1px solid #D6DDE6;border-radius:8px;padding:18px 20px">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#E87A5D;font-weight:700">
            Your turn?
          </p>
          <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#2B5B84;line-height:1.35">
            Go incognito and get matched with openings from recruiters who are already looking.
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#5B616B;line-height:1.5">
            Join MatchLever as a job candidate — stay anonymous, publish verified signal, and let eager recruiters find you.
          </p>
          <a href="${onboardingUrl}" style="background:#E87A5D;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">
            Start as an incognito candidate
          </a>
        </div>
    `,
  });

  return { ...delivered, inviteUrl };
}

export async function sendIncompleteProfileReminderEmail(args: {
  to: string;
  candidateName: string | null;
  incompleteItems: string[];
  profileUrl: string;
}) {
  const firstName = oneLine(args.candidateName || "").split(/\s+/)[0] || "";
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const items = args.incompleteItems
    .map((item) => oneLine(item))
    .filter(Boolean);
  const itemsHtml = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const profileUrl = args.profileUrl;
  const subject = firstName
    ? `${firstName}, your MatchLever profile is incomplete`
    : "Your MatchLever profile is incomplete";

  return deliverAutomatedEmail({
    to: args.to,
    subject,
    html: `
        <p>${greeting}</p>
        <p>Your MatchLever candidate profile is still incomplete, so recruiters
        cannot find you yet. Please finish the items below:</p>
        <ul>${itemsHtml}</ul>
        <p>
          <a href="${profileUrl}" style="background:#2B5B84;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block">
            Complete your profile
          </a>
        </p>
        <p style="font-size:12px;color:#5B616B">Or paste this URL:<br/>${profileUrl}</p>
        <p style="font-size:12px;color:#5B616B">We'll send this reminder weekly until your profile is complete.</p>
    `,
  });
}
