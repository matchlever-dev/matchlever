import { z } from "zod";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type FaqItemDraft = {
  id?: string;
  question: string;
  answer: string;
};

export function faqItemAnchorId(index: number) {
  return `faq-item-${index}`;
}

export function faqItemLinkLabel(question: string, index: number) {
  const trimmed = question.trim();
  return trimmed || `Question ${index + 1}`;
}

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: "default-0",
    question: "What is MatchLever and what is it for?",
    answer:
      "We are a dual-sided marketplace built by Arise Solutions LLC to connect top-tier candidates with hiring organizations. Our platform is designed to generate precise career matches with zero search fatigue - meaning no endless scrolling or firing resumes into the void. Employers only pay when they find a match.",
    sortOrder: 0,
  },
  {
    id: "default-1",
    question: "What are the main advantages?",
    answer: `Zero Bias: Our AI Sanitizer Engine automatically strips all Personally Identifiable Information (PII) from your uploaded resume, including your full name, university, and past employer names.

Superpower Taglines: Instead of vague cover letters, our AI evaluates your verified tech stack to generate three metrics-driven "Superpower Taglines" for you to choose from.

Smart Matching: Our Two-Tier Match Engine filters by hard dealbreakers (minimum salary, work authorization) and semantic alignment (daily working hours overlap) to ensure we only surface relevant roles.`,
    sortOrder: 1,
  },
  {
    id: "default-2",
    question: "What problems do these features address?",
    answer: `Candidates - Sending thousands of applications and get no interview?  We ensure that the job best suited you will find you.

Employers: Tired of going thru hundreds of AI-modified resumes for one job opening?  Never missed that perfect match to your opening again!

Mismatch: The worst problem is finding the candidate not really suited after rounds of interviews, or failing to provide legimate references!!!  MatchLever candidates are already vetted AND you only see those with matching characteristics, which vastly increase the chance of a successful hire with less effort and time.`,
    sortOrder: 2,
  },
  {
    id: "default-3",
    question: "Is my data private?",
    answer: `Not only do we have industry-standard data privacy and security protection, we go one step beyond by operating on Incognito Privacy Mode!  Your identity remains completely anonymous to employers on your profiles unless they decide to go to next step with you.  Your contact email, real name, and original resume are only revealed after an employer accepts your match to advance you to the interview stage.  Hit the "On Hold (Snoozed)" toggle to vanish from employer searches, or use the "Delete Account" button to wipe your data permanently.`,
    sortOrder: 3,
  },
  {
    id: "default-4",
    question: "Why do you require reference checks?",
    answer:
      "Because your profile is completely anonymous, we need to prove you are as good as your stats. We use a peer-validated system where you provide three email addresses for former managers or peers. Our Multi-Signal AI Authenticity Scoring Matrix analyzes their LinkedIn profiles to check for bot-farm patterns and account maturity. It keeps platform trust high and ensures real professionals are vouching for your work.",
    sortOrder: 4,
  },
  {
    id: "default-5",
    question: "What happens next after I set up my profile?",
    answer: `1. References: Make sure your references respond to reference check requests, see further actions in the next question.

2.Match: Once your profile is completed and references checked out, AI and Concierge evaluation.Your anonymous profile is evaluated automatically by our Two-Tier Match Engine, or manually pushed to employer Kanban boards by our Concierge Superusers.

3.Unlock & Interview: When an employer decides you are a fit, they pay to unlock your profile. Your identity is revealed, and you head straight into the interview stage.`,
    sortOrder: 5,
  },
  {
    id: "default-6",
    question: "How do I make sure references responds?",
    answer: `First of all, make sure these are legit reference that know you and will vouch for you.

Also, be sure to let the references know that NO ONE will actually speak to them right away.  They just need to respond to an email with a few questions, which shouldn't take more than a couple of minutes.

Finally, if they do not receive reference validation emails a few minutes after you submit your profile, please ask them to check their Spam/Junk folder for an email from MatchLever.`,
    sortOrder: 6,
  },
];

const faqItemDraftSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(10000),
});

export const faqUpdateSchema = z.object({
  items: z.array(faqItemDraftSchema).min(1).max(50),
});

export type FaqUpdate = z.infer<typeof faqUpdateSchema>;

export function mapFaqRows(
  rows: Array<{
    id: string;
    question: string;
    answer: string;
    sort_order: number;
  }>
): FaqItem[] {
  return rows
    .map((row) => ({
      id: row.id,
      question: String(row.question ?? "").trim(),
      answer: String(row.answer ?? "").trim(),
      sortOrder: row.sort_order,
    }))
    .filter((item) => item.question && item.answer)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
