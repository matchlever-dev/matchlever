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

export async function sendReferenceInviteEmail(args: {
  to: string;
  candidateTitle: string;
  token: string;
}) {
  const resend = getResendClient();
  const inviteUrl = getReferenceInviteUrl(args.token);
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "MatchLever <onboarding@resend.dev>";

  if (!resend) {
    console.info("[resend demo]", { to: args.to, inviteUrl });
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
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { demo: false as const, inviteUrl, id: data?.id };
}
