import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEMO_EMPLOYER_JOB_MATCHES,
  DEMO_EMPLOYER_MATCH_VIEWS,
  getMatchViewPath,
} from "@/lib/employer/job-matches";

test("getMatchViewPath encodes accept token", () => {
  assert.equal(
    getMatchViewPath("demo-employer-match-token-0001"),
    "/matches/view?token=demo-employer-match-token-0001"
  );
});

test("demo job 1 has a pending match; job 2 is empty", () => {
  const one = DEMO_EMPLOYER_JOB_MATCHES["demo-job-1"];
  const two = DEMO_EMPLOYER_JOB_MATCHES["demo-job-2"];
  assert.equal(one.length, 1);
  assert.equal(one[0].employerResponse, "pending");
  assert.equal(two.length, 0);
  assert.ok(
    DEMO_EMPLOYER_MATCH_VIEWS[one[0].acceptToken]?.profile.headline
  );
});
