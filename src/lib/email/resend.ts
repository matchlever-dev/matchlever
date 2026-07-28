import { Resend } from "resend";

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

export function getSeekerOnboardingUrl() {
  return `${getAppBaseUrl()}/onboarding`;
}

export async function sendReferenceInviteEmail(args: {
  to: string;
  candidateTitle: string;
  token: string;
}) {
  const resend = getResendClient();
  const inviteUrl = getReferenceInviteUrl(args.token);
  const onboardingUrl = getSeekerOnboardingUrl();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "MatchLever <onboarding@resend.dev>";

  if (!resend) {
    console.info("[resend demo]", { to: args.to, inviteUrl, onboardingUrl });
    return { demo: true as const, inviteUrl };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: args.to,
    subject: "Please verify a MatchLever reference",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#2A2D34">
        <p>Hello,</p>
        <p>You've been asked to verify a reference for a MatchLever candidate
        (<strong>${args.candidateTitle}</strong>).</p>
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
            Join MatchLever as a job seeker — stay anonymous, publish verified signal, and let eager recruiters find you.
          </p>
          <a href="${onboardingUrl}" style="background:#E87A5D;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">
            Start as an incognito seeker
          </a>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { demo: false as const, inviteUrl, id: data?.id };
}
