export type FeaturedTalent = {
  id: string;
  firstName: string;
  title: string;
  tagline: string;
  superPower: string;
  imageUrl: string | null;
  profileHref: string;
};

/** Curated fallback when the live talent pool is empty or unavailable. */
export const FEATURED_TALENT: FeaturedTalent[] = [
  {
    id: "1",
    firstName: "Alex",
    title: "Senior Full-Stack Engineer",
    tagline:
      "Architecting scalable backends and leading agile development teams.",
    superPower: "⚡ React, Node.js, & Cloud Infrastructure",
    imageUrl: null,
    profileHref: "/employer/waitlist",
  },
  {
    id: "2",
    firstName: "Jordan",
    title: "Staff Platform Engineer",
    tagline: "Cut p99 latency 62% on a multi-region event bus.",
    superPower: "⚡ Go, Kubernetes, & Distributed Systems",
    imageUrl: null,
    profileHref: "/employer/waitlist",
  },
  {
    id: "3",
    firstName: "Sam",
    title: "Principal Data Engineer",
    tagline: "Rebuilt warehouse pipelines — $1.4M annual cloud savings.",
    superPower: "⚡ Python, Spark, & Analytics Platforms",
    imageUrl: null,
    profileHref: "/employer/waitlist",
  },
];
