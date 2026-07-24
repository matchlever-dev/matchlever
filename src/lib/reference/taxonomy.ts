export type SuperpowerCategory =
  | "Architecture"
  | "Data Heavyweight"
  | "Business Process"
  | "Crisis Fixer"
  | "Stakeholder Mgmt"
  | "High Output Speed"
  | "Cross-Ecosystem";

export type SuperpowerOption = {
  id: string;
  label: string;
  category: SuperpowerCategory;
};

export const SUPERPOWER_CATEGORIES: SuperpowerCategory[] = [
  "Architecture",
  "Data Heavyweight",
  "Business Process",
  "Crisis Fixer",
  "Stakeholder Mgmt",
  "High Output Speed",
  "Cross-Ecosystem",
];

/** Interactive Superpower Grid — pick exactly 7 across these options. */
export const SUPERPOWER_TAXONOMY: SuperpowerOption[] = [
  // Architecture
  { id: "arch-systems", label: "Systems thinker", category: "Architecture" },
  { id: "arch-scalable", label: "Scalable by default", category: "Architecture" },
  { id: "arch-tradeoffs", label: "Sharp tradeoff judge", category: "Architecture" },
  { id: "arch-platform", label: "Platform builder", category: "Architecture" },
  // Data Heavyweight
  { id: "data-pipelines", label: "Pipeline craftsman", category: "Data Heavyweight" },
  { id: "data-modeling", label: "Data model surgeon", category: "Data Heavyweight" },
  { id: "data-insight", label: "Insight from chaos", category: "Data Heavyweight" },
  { id: "data-quality", label: "Quality gatekeeper", category: "Data Heavyweight" },
  // Business Process
  { id: "biz-ops", label: "Ops simplifier", category: "Business Process" },
  { id: "biz-automation", label: "Automation catalyst", category: "Business Process" },
  { id: "biz-roi", label: "ROI translator", category: "Business Process" },
  { id: "biz-delivery", label: "Delivery playbooker", category: "Business Process" },
  // Crisis Fixer
  { id: "crisis-calm", label: "Calm under fire", category: "Crisis Fixer" },
  { id: "crisis-root", label: "Root-cause hunter", category: "Crisis Fixer" },
  { id: "crisis-restore", label: "Fast restore lead", category: "Crisis Fixer" },
  { id: "crisis-prevent", label: "Incident preventer", category: "Crisis Fixer" },
  // Stakeholder Mgmt
  { id: "stake-align", label: "Alignment builder", category: "Stakeholder Mgmt" },
  { id: "stake-exec", label: "Exec-ready communicator", category: "Stakeholder Mgmt" },
  { id: "stake-conflict", label: "Conflict defuser", category: "Stakeholder Mgmt" },
  { id: "stake-trust", label: "Trust accumulator", category: "Stakeholder Mgmt" },
  // High Output Speed
  { id: "speed-ship", label: "Ships relentlessly", category: "High Output Speed" },
  { id: "speed-focus", label: "Focus laser", category: "High Output Speed" },
  { id: "speed-bias", label: "Bias to action", category: "High Output Speed" },
  { id: "speed-multiply", label: "Team multiplier", category: "High Output Speed" },
  // Cross-Ecosystem
  { id: "eco-glue", label: "Org glue", category: "Cross-Ecosystem" },
  { id: "eco-bridge", label: "Cross-team bridge", category: "Cross-Ecosystem" },
  { id: "eco-polyglot", label: "Stack polyglot", category: "Cross-Ecosystem" },
  { id: "eco-partner", label: "Partner integrator", category: "Cross-Ecosystem" },
];

export function groupSuperpowersByCategory() {
  return SUPERPOWER_CATEGORIES.map((category) => ({
    category,
    options: SUPERPOWER_TAXONOMY.filter((item) => item.category === category),
  }));
}
