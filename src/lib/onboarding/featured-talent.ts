export type FeaturedTalent = {
  id: string;
  title: string;
  tagline: string;
  superPower: string;
  profileHref: string;
};

/** Curated anonymous fallback when the live talent pool is empty or unavailable. */
export const FEATURED_TALENT: FeaturedTalent[] = [
  {
    id: "1",
    title: "Senior Full-Stack Engineer",
    tagline:
      "Architecting scalable backends and leading agile development teams.",
    superPower: "⚡ React, Node.js, & Cloud Infrastructure",
    profileHref: "/employer/waitlist",
  },
  {
    id: "2",
    title: "Staff Platform Engineer",
    tagline: "Cut p99 latency 62% on a multi-region event bus.",
    superPower: "⚡ Go, Kubernetes, & Distributed Systems",
    profileHref: "/employer/waitlist",
  },
  {
    id: "3",
    title: "Principal Data Engineer",
    tagline: "Rebuilt warehouse pipelines — $1.4M annual cloud savings.",
    superPower: "⚡ Python, Spark, & Analytics Platforms",
    profileHref: "/employer/waitlist",
  },
];
