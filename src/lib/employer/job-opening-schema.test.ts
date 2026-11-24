import assert from "node:assert/strict";
import { test } from "node:test";

import {
  defaultJobOpeningValues,
  jobOpeningFormSchema,
  type JobOpeningFormValues,
} from "@/lib/employer/job-opening-schema";

function base(overrides: Partial<JobOpeningFormValues> = {}): JobOpeningFormValues {
  return {
    ...defaultJobOpeningValues,
    title: "Staff Engineer",
    verifiedSkills: ["TypeScript"],
    suggestedTaglines: [
      "Ships resilient product platforms",
      "Owns ambiguous technical bets",
      "Mentors senior ICs with clarity",
    ],
    ...overrides,
  };
}

test("remote-only does not require country or closest city", () => {
  const result = jobOpeningFormSchema.safeParse(
    base({
      locationModes: ["remote"],
      globalCountry: "",
      globalCity: "",
      customCity: "",
    })
  );
  assert.equal(result.success, true);
});

test("hybrid requires country and closest city", () => {
  const result = jobOpeningFormSchema.safeParse(
    base({
      locationModes: ["hybrid"],
      maxCommuteMiles: 30,
      openToRelocation: false,
      globalCountry: "",
      globalCity: "",
    })
  );
  assert.equal(result.success, false);
  if (result.success) return;
  const paths = result.error.issues.map((issue) => issue.path.join("."));
  assert.ok(paths.includes("globalCountry"));
  assert.ok(paths.includes("globalCity"));
});

test("onsite accepts country and city when commute fields are set", () => {
  const result = jobOpeningFormSchema.safeParse(
    base({
      locationModes: ["onsite"],
      maxCommuteMiles: 25,
      openToRelocation: true,
      globalCountry: "United States",
      globalCity: "Austin",
    })
  );
  assert.equal(result.success, true);
});

test("remote plus hybrid still requires base location", () => {
  const result = jobOpeningFormSchema.safeParse(
    base({
      locationModes: ["remote", "hybrid"],
      maxCommuteMiles: 40,
      openToRelocation: false,
      globalCountry: "",
      globalCity: "",
    })
  );
  assert.equal(result.success, false);
  if (result.success) return;
  const paths = result.error.issues.map((issue) => issue.path.join("."));
  assert.ok(paths.includes("globalCountry"));
  assert.ok(paths.includes("globalCity"));
});
