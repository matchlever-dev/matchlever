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

export function getTalentOnboardingUrl() {
  return `${getAppBaseUrl()}/onboarding`;
}

export function getTalentDashboardUrl() {
  return `${getAppBaseUrl()}/dashboard/talent`;
}

/** Email CTA: login, then continue onboarding or open the talent profile. */
export function getTalentProfileReminderUrl(hasTalentProfile: boolean) {
  const next = hasTalentProfile ? "/dashboard/talent" : "/onboarding";
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
  talentName: string,
  reminder = false
) {
  const name = oneLine(talentName);
  const prefix = reminder ? "Reminder: please verify" : "Please verify";
  if (!name || name === "a MatchLever talent") {
    return `${prefix} a MatchLever reference`;
  }
  return `${prefix} a MatchLever reference for ${name}`;
}

export async function sendReferenceInviteEmail(args: {
  to: string;
  talentName: string;
  talentTitle: string;
  token: string;
  reminder?: boolean;
}) {
  const inviteUrl = getReferenceInviteUrl(args.token);
  const onboardingUrl = getTalentOnboardingUrl();
  const talentName = oneLine(args.talentName) || "a MatchLever talent";
  const talentTitle = oneLine(args.talentTitle);
  const reminder = Boolean(args.reminder);
  const subject = referenceInviteSubject(talentName, reminder);
  const nameHtml = escapeHtml(talentName);
  const titleHtml = talentTitle ? escapeHtml(talentTitle) : "";
  const whoHtml =
    talentName === "a MatchLever talent"
      ? `a MatchLever talent${titleHtml ? ` (<strong>${titleHtml}</strong>)` : ""}`
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
            Go incognito and get matched with openings from employers who are already looking.
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#5B616B;line-height:1.5">
            Join MatchLever as talent — stay anonymous, publish verified signal, and let eager employers find you.
          </p>
          <a href="${onboardingUrl}" style="background:#E87A5D;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">
            Start as an incognito talent
          </a>
        </div>
    `,
  });

  return { ...delivered, inviteUrl };
}

export function getMatchRespondUrl(
  token: string,
  decision: "accept" | "pass"
) {
  const params = new URLSearchParams({
    token,
    decision,
  });
  return `${getAppBaseUrl()}/matches/respond?${params.toString()}`;
}

export function getMatchAcceptUrl(token: string) {
  return getMatchRespondUrl(token, "accept");
}

export function getMatchPassUrl(token: string) {
  return getMatchRespondUrl(token, "pass");
}

/** In-app (and email-equivalent) view of the incognito profile. */
export function getMatchViewUrl(token: string) {
  const params = new URLSearchParams({ token });
  return `${getAppBaseUrl()}/matches/view?${params.toString()}`;
}

export async function sendMatchIncognitoEmail(args: {
  to: string;
  employerName: string | null;
  jobTitle: string;
  companyName: string | null;
  profile: {
    initials: string;
    headline: string;
    tagline: string;
    summary: string;
    verifiedSkills: string[];
    yearsExperience: number | null;
    locationLine: string;
    timezoneLabel: string;
    locationModes: string[];
    payType?: "annual" | "hourly" | null;
    minSalary: number | null;
    visaStatus: string | null;
    workHours: string | null;
  };
  acceptToken: string;
  billingStatus: "free" | "invoiced";
  matchIndex: number;
}) {
  const firstName =
    oneLine(args.employerName || "").split(/\s+/)[0] || "";
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const jobTitle = escapeHtml(oneLine(args.jobTitle));
  const company = oneLine(args.companyName || "");
  const acceptUrl = getMatchAcceptUrl(args.acceptToken);
  const passUrl = getMatchPassUrl(args.acceptToken);
  const p = args.profile;
  const skillsHtml = p.verifiedSkills.length
    ? p.verifiedSkills
        .map(
          (skill) =>
            `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 8px;border:1px solid #D6DDE6;background:#F7F6F3;font-size:12px;color:#2B5B84">${escapeHtml(skill)}</span>`
        )
        .join("")
    : `<span style="font-size:13px;color:#5B616B">Skills shared after accept</span>`;
  const modes = p.locationModes
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(" / ");
  const billingNote =
    args.billingStatus === "free"
      ? `Match #${args.matchIndex} on this opening is marked free.`
      : `Match #${args.matchIndex} on this opening is marked invoiced (manual invoice).`;

  return deliverAutomatedEmail({
    to: args.to,
    subject: `New MatchLever match for ${oneLine(args.jobTitle)}`,
    html: `
        <p>${greeting}</p>
        <p>MatchLever matched an anonymous candidate to
          <strong>${jobTitle}</strong>${company ? ` at ${escapeHtml(company)}` : ""}.
          Review the incognito profile below. Identity stays hidden until you Accept.
          You can also Pass if this candidate is not a fit.</p>

        <div style="border:1px solid #D6DDE6;border-radius:8px;padding:20px;margin:20px 0;background:#fff">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#5B616B;font-weight:700">Incognito profile</p>
          <div style="display:flex;align-items:center;gap:12px;margin:12px 0 8px">
            <div style="width:48px;height:48px;border-radius:999px;background:#2B5B84;color:#fff;font-weight:700;font-size:16px;line-height:48px;text-align:center">${escapeHtml(p.initials)}</div>
            <div>
              <p style="margin:0;font-size:18px;font-weight:700;color:#2A2D34">${escapeHtml(p.headline)}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#2B5B84">${escapeHtml(p.tagline)}</p>
            </div>
          </div>
          <p style="margin:12px 0;font-size:14px;line-height:1.55;color:#2A2D34;white-space:pre-wrap">${escapeHtml(p.summary)}</p>
          <p style="margin:16px 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5B616B;font-weight:700">Verified skills</p>
          <div>${skillsHtml}</div>
          <table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:13px;color:#2A2D34">
            <tr><td style="padding:6px 0;color:#5B616B">Location</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.locationLine)}</td></tr>
            <tr><td style="padding:6px 0;color:#5B616B">Timezone</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.timezoneLabel)}</td></tr>
            ${modes ? `<tr><td style="padding:6px 0;color:#5B616B">Work modes</td><td style="padding:6px 0;text-align:right">${escapeHtml(modes)}</td></tr>` : ""}
            ${p.yearsExperience != null ? `<tr><td style="padding:6px 0;color:#5B616B">Experience</td><td style="padding:6px 0;text-align:right">${p.yearsExperience} years</td></tr>` : ""}
            ${p.minSalary != null ? `<tr><td style="padding:6px 0;color:#5B616B">Pay</td><td style="padding:6px 0;text-align:right">$${p.minSalary.toLocaleString("en-US")}${p.payType === "hourly" ? "/hr" : "/yr"}</td></tr>` : ""}
            ${p.workHours ? `<tr><td style="padding:6px 0;color:#5B616B">Work hours</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.workHours)}</td></tr>` : ""}
            ${p.visaStatus ? `<tr><td style="padding:6px 0;color:#5B616B">Work auth</td><td style="padding:6px 0;text-align:right">${escapeHtml(p.visaStatus)}</td></tr>` : ""}
          </table>
        </div>

        <p style="margin:24px 0 12px">
          <a href="${acceptUrl}" style="background:#E87A5D;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;margin-right:10px">
            Accept
          </a>
          <a href="${passUrl}" style="background:#fff;color:#2B5B84;padding:12px 18px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;border:1px solid #2B5B84">
            Pass
          </a>
        </p>
        <p style="font-size:12px;color:#5B616B">Accept sends this candidate’s LinkedIn profile to you so you can start the conversation. Pass keeps identity hidden and records that this candidate is not a fit.</p>
        <p style="font-size:12px;color:#5B616B">Accept link:<br/>${acceptUrl}</p>
        <p style="font-size:12px;color:#5B616B">Pass link:<br/>${passUrl}</p>
        <p style="font-size:11px;color:#8A9099">${escapeHtml(billingNote)}</p>
    `,
  });
}

export async function sendMatchLinkedInEmail(args: {
  to: string;
  employerName: string | null;
  jobTitle: string;
  companyName: string | null;
  talentHeadline: string;
  linkedinUrl: string;
}) {
  const firstName =
    oneLine(args.employerName || "").split(/\s+/)[0] || "";
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const jobTitle = escapeHtml(oneLine(args.jobTitle));
  const headline = escapeHtml(oneLine(args.talentHeadline));
  const linkedinUrl = args.linkedinUrl;

  return deliverAutomatedEmail({
    to: args.to,
    subject: `LinkedIn unlocked · ${oneLine(args.talentHeadline)}`,
    html: `
        <p>${greeting}</p>
        <p>You accepted the MatchLever match for <strong>${jobTitle}</strong>.</p>
        <p>Here is the candidate’s LinkedIn profile for <strong>${headline}</strong>:</p>
        <p>
          <a href="${escapeHtml(linkedinUrl)}" style="background:#2B5B84;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">
            Open LinkedIn profile
          </a>
        </p>
        <p style="font-size:12px;color:#5B616B">Or paste this URL:<br/>${escapeHtml(linkedinUrl)}</p>
    `,
  });
}

export async function sendIncompleteProfileReminderEmail(args: {
  to: string;
  talentName: string | null;
  incompleteItems: string[];
  profileUrl: string;
}) {
  const firstName = oneLine(args.talentName || "").split(/\s+/)[0] || "";
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
        <p>Your MatchLever talent profile is still incomplete, so employers
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
