import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatTalentPayRequirement,
  legacyPayMirrorFromRequirement,
  normalizeTalentPayRequirement,
  talentPayRangeForJobType,
  talentPayRequirementFromRow,
  talentPayRequirementToDb,
} from "@/lib/pay";

test("normalize clears disabled denominations and orders max >= min", () => {
  const req = normalizeTalentPayRequirement({
    wantAnnual: true,
    wantHourly: false,
    payAnnualMin: 180000,
    payAnnualMax: 150000,
    payHourlyMin: 90,
    payHourlyMax: 100,
  });
  assert.deepEqual(req, {
    payAnnualMin: 180000,
    payAnnualMax: 180000,
    payHourlyMin: null,
    payHourlyMax: null,
  });
});

test("legacy mirror prefers annual floor", () => {
  const mirror = legacyPayMirrorFromRequirement({
    payAnnualMin: 160000,
    payAnnualMax: 200000,
    payHourlyMin: 80,
    payHourlyMax: 100,
  });
  assert.deepEqual(mirror, { payType: "annual", minSalary: 160000 });
});

test("row parser falls back to legacy min_salary", () => {
  const fromLegacy = talentPayRequirementFromRow({
    pay_type: "hourly",
    min_salary: 85,
  });
  assert.equal(fromLegacy.payHourlyMin, 85);
  assert.equal(fromLegacy.payAnnualMin, null);
});

test("talentPayRangeForJobType converts across denominations", () => {
  const native = talentPayRangeForJobType(
    {
      payAnnualMin: 150000,
      payAnnualMax: 180000,
      payHourlyMin: null,
      payHourlyMax: null,
    },
    "annual"
  );
  assert.equal(native.source, "native");
  assert.equal(native.min, 150000);

  const converted = talentPayRangeForJobType(
    {
      payAnnualMin: 208000,
      payAnnualMax: null,
      payHourlyMin: null,
      payHourlyMax: null,
    },
    "hourly"
  );
  assert.equal(converted.source, "converted");
  assert.equal(converted.min, 100);
});

test("db payload includes mirrors", () => {
  const db = talentPayRequirementToDb({
    payAnnualMin: null,
    payAnnualMax: null,
    payHourlyMin: 75,
    payHourlyMax: 95,
  });
  assert.equal(db.pay_type, "hourly");
  assert.equal(db.min_salary, 75);
  assert.equal(db.pay_hourly_max, 95);
});

test("formatTalentPayRequirement shows both denominations", () => {
  const label = formatTalentPayRequirement({
    payAnnualMin: 140000,
    payAnnualMax: 180000,
    payHourlyMin: 70,
    payHourlyMax: null,
  });
  assert.match(label ?? "", /\/yr/);
  assert.match(label ?? "", /\/hr/);
});
