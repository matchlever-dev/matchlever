import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decisionToResponse,
  employerResponseLabel,
  isEmployerMatchDecision,
} from "@/lib/matching/employer-response";

test("accept and pass are the only decisions", () => {
  assert.equal(isEmployerMatchDecision("accept"), true);
  assert.equal(isEmployerMatchDecision("pass"), true);
  assert.equal(isEmployerMatchDecision("reject"), false);
  assert.equal(isEmployerMatchDecision("decline"), false);
});

test("decision maps to tracked response", () => {
  assert.equal(decisionToResponse("accept"), "accepted");
  assert.equal(decisionToResponse("pass"), "passed");
});

test("labels use Pass wording", () => {
  assert.equal(employerResponseLabel("passed"), "Passed");
  assert.equal(employerResponseLabel("accepted"), "Accepted");
  assert.equal(employerResponseLabel("pending"), "Pending");
});
