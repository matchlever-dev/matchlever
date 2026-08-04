/** Human-readable Candidate Terms for in-app display. Authoritative copy is the PDF. */

export const CANDIDATE_TOS_SECTIONS = [
  {
    heading: "1. Acceptance of Terms & Services Overview",
    body: `By completing the Candidate Onboarding Wizard, you agree to be bound by these Terms. MatchLever operates as a dual-sided marketplace designed to generate precise matches with zero search fatigue. While the platform charges hiring organizations fees for interviewing candidates, use of the platform is strictly governed by the rules outlined below.`,
  },
  {
    heading: "2. Intellectual Property & Right to Refuse Service",
    bullets: [
      "Corporate Ownership: You acknowledge and agree that Arise Solutions LLC retains absolute ownership of all platform code, underlying data, database schemas, and AI-generated outputs created within the MatchLever system.",
      "Right to Refuse Service: Arise Solutions LLC reserves the unequivocal right to refuse service, suspend access, or permanently delete any user account at any time, at its sole discretion.",
    ],
  },
  {
    heading: "3. Account Eligibility & Registration",
    bullets: [
      "Accuracy of Information: During onboarding, you must provide accurate global preferences, including your location mode (Remote, Hybrid, Onsite), global city and country, timezone offset, work hours start and end times, minimum salary, and work authorization status.",
      "LinkedIn Authentication: Account creation requires a secure LinkedIn OAuth sign-in.",
      "Platform Integrity: Fraudulent or duplicate accounts will be subject to immediate deletion by platform Admins.",
    ],
  },
  {
    heading: "4. Candidate Profile, AI Sanitization, & Anonymity",
    intro:
      'MatchLever utilizes an "Incognito Privacy Mode" to ensure a bias-free evaluation process.',
    bullets: [
      "AI Resume Sanitization: Upon uploading your resume (PDF/DOCX), our AI Sanitizer Engine automatically strips all Personally Identifiable Information (PII). This includes your full name, specific street addresses, university names, and past employer company names.",
      'Superpower Taglines: To prevent vague or boastful self-reporting, candidates cannot enter freeform summary text. Instead, the AI evaluates your verified resume data and technical stack to generate three high-impact, metrics-driven "Superpower Tagline" options. You are required to select one of these three options during onboarding.',
    ],
  },
  {
    heading: "5. Reference Intake & Authenticity Assessment",
    intro:
      "MatchLever utilizes a peer-validated reference system to enhance profile trust.",
    bullets: [
      "Reference Submission: You must provide email addresses for three references. Each may be a former manager or a peer — any mix of the two is accepted.",
      "LinkedIn URL Verification: References are required to submit their full LinkedIn Profile URL when providing feedback.",
      "AI Authenticity Scoring: MatchLever runs a Multi-Signal AI Authenticity Scoring Matrix on all reference LinkedIn profiles. This system checks for bot-farm patterns, evaluates profile completeness against candidate claims, and checks connection counts and account maturity.",
      'Manual Review Flags: Any reference scoring below a 60% authenticity threshold will be flagged in the Admin portal with a "Low Authenticity / Potential Fake LinkedIn" warning for manual review. Arise Solutions LLC reserves the right to disqualify flagged references.',
    ],
  },
  {
    heading: "6. Matching & Profile Unlocking",
    bullets: [
      "Two-Tier Match Engine: Your profile is evaluated against job postings based on hard dealbreakers (like minimum salary and work authorization) and a Tier 2 Semantic match that calculates daily working hours overlap and superpower alignment.",
      'Concierge Manual Matches: MatchLever Superusers have access to a global directory and hold the authority to perform "Manual Matches," pushing your profile directly to an employer\'s Kanban board.',
      'Profile Unlocking: Your true identity remains completely anonymous on your candidate card. Your contact email, real full name, original resume URL, and LinkedIn URL are only revealed (status changed to "UNLOCKED") after an employer accepts your match and pays a non-refundable $199 fee to proceed to the interview stage.',
    ],
  },
  {
    heading: "7. Data Privacy & Candidate Controls",
    bullets: [
      'On Hold / Snoozed Status: If you are no longer actively looking, you can use the "On Hold (Snoozed)" toggle switch on your Candidate Dashboard. This immediately updates your database status and guarantees your profile is entirely hidden from all employer searches.',
      'Account Deletion: You may permanently delete your account and all associated records using the "Delete Account" button on your dashboard.',
    ],
  },
  {
    heading: "8. Disclaimers & Limitation of Liability",
    bullets: [
      "No Guarantee of Employment: Arise Solutions LLC acts strictly as a platform facilitator. We do not guarantee employment or interviews.",
      "Employer Actions: Arise Solutions LLC is not responsible for the conduct or hiring decisions of organizations using the platform.",
    ],
  },
] as const;
