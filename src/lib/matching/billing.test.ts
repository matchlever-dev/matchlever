import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MATCHES_PER_INVOICE_CYCLE,
  markMatchBilling,
} from "@/lib/matching/billing";

test("first match in each 7-match cycle is free", () => {
  assert.equal(MATCHES_PER_INVOICE_CYCLE, 7);
  assert.deepEqual(markMatchBilling(1), {
    matchIndex: 1,
    billingStatus: "free",
    invoiceCycle: 1,
    cyclePosition: 1,
  });
  assert.equal(markMatchBilling(8).billingStatus, "free");
  assert.equal(markMatchBilling(8).invoiceCycle, 2);
});

test("matches 2–7 are invoiced under one cycle", () => {
  for (let i = 2; i <= 7; i += 1) {
    const mark = markMatchBilling(i);
    assert.equal(mark.billingStatus, "invoiced");
    assert.equal(mark.invoiceCycle, 1);
    assert.equal(mark.cyclePosition, i);
  }
});

test("rejects non-positive match indexes", () => {
  assert.throws(() => markMatchBilling(0));
  assert.throws(() => markMatchBilling(-1));
  assert.throws(() => markMatchBilling(1.5));
});
