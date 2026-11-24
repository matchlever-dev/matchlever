import type { IncognitoProfile } from "@/lib/matching/incognito-profile";
import { formatPayAmount } from "@/lib/pay";

/** Employer-facing incognito profile — mirrors the match email layout. */
export function IncognitoProfileCard({
  profile,
}: {
  profile: IncognitoProfile;
}) {
  const modes = profile.locationModes
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(" / ");
  const payLine = formatPayAmount(profile.minSalary, profile.payType);

  return (
    <article className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
      <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#5B616B] uppercase">
        Incognito profile
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2B5B84] text-sm font-bold text-white"
          aria-hidden
        >
          {profile.initials}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-[#2A2D34]">
            {profile.headline}
          </h2>
          <p className="mt-1 text-sm text-[#2B5B84]">{profile.tagline}</p>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#2A2D34]">
        {profile.summary}
      </p>

      <p className="mt-5 font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
        Verified skills
      </p>
      {profile.verifiedSkills.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.verifiedSkills.map((skill) => (
            <span
              key={skill}
              className="border border-[#2B5B84]/20 bg-[#F7F6F3] px-2.5 py-1 text-xs font-medium text-[#2B5B84]"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#5B616B]">
          Skills shared after Accept
        </p>
      )}

      <dl className="mt-5 grid gap-3 border-t border-[#2B5B84]/10 pt-4 text-sm">
        <Row label="Location" value={profile.locationLine} />
        <Row label="Timezone" value={profile.timezoneLabel} />
        {modes ? <Row label="Work modes" value={modes} /> : null}
        {profile.yearsExperience != null ? (
          <Row label="Experience" value={`${profile.yearsExperience} years`} />
        ) : null}
        {profile.minSalary != null ? (
          <Row label="Pay" value={payLine} />
        ) : null}
        {profile.workHours ? (
          <Row label="Work hours" value={profile.workHours} />
        ) : null}
        {profile.visaStatus ? (
          <Row label="Work auth" value={profile.visaStatus} />
        ) : null}
      </dl>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#5B616B]">{label}</dt>
      <dd className="text-right font-medium text-[#2A2D34]">{value}</dd>
    </div>
  );
}
