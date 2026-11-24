import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isMatchableTalentStatus,
  talentStatusLabel,
} from "@/lib/matching/eligibility";

test("only Active and On Hold are matchable", () => {
  assert.equal(isMatchableTalentStatus("actively_looking"), true);
  assert.equal(isMatchableTalentStatus("on_hold"), true);
  assert.equal(isMatchableTalentStatus("incomplete"), false);
  assert.equal(isMatchableTalentStatus(null), false);
});

test("status labels", () => {
  assert.equal(talentStatusLabel("actively_looking"), "Active");
  assert.equal(talentStatusLabel("on_hold"), "On Hold");
  assert.equal(talentStatusLabel("incomplete"), "Incomplete");
});
