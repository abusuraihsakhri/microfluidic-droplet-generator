const test = require("node:test");
const assert = require("node:assert/strict");
const { calculate, evaluateRules } = require("./calculator.js");

const reference = {
  diameterUm: 100, viscosityMpaS: 1, velocityMmS: 10,
  surfaceTensionMnM: 10, densityKgM3: 1000, hydraulicDiameterUm: 100,
  dispersedFlowUlMin: 60, cellConcentrationPerMl: 1000,
};
test("spherical volume and units", () => {
  const r = calculate(reference);
  assert.ok(Math.abs(r.dropletVolumeUl - Math.PI / 6000) < 1e-12);
  assert.ok(Math.abs(r.capillaryNumber - .001) < 1e-12);
  assert.ok(Math.abs(r.reynoldsNumber - 1) < 1e-12);
  assert.ok(Math.abs(r.dropletFrequencyHz - (1 / r.dropletVolumeUl)) < 1e-10);
});
test("Poisson occupancy probabilities sum to one", () => {
  const r = calculate(reference);
  assert.ok(Math.abs(r.pZero + r.pOne + r.pMultiple - 1) < 1e-12);
  assert.ok(Math.abs(r.lambda - r.dropletVolumeUl) < 1e-12);
});
test("zero concentration and flow have defined outputs", () => {
  const r = calculate({ ...reference, cellConcentrationPerMl: 0, dispersedFlowUlMin: 0 });
  assert.equal(r.pZero, 1);
  assert.equal(r.pOne, 0);
  assert.equal(r.pMultiple, 0);
  assert.equal(r.dropletFrequencyHz, 0);
  assert.equal(r.singleCellAmongOccupied, 0);
});
test("invalid and nonfinite measurements fail closed", () => {
  for (const changed of [{ diameterUm: 0 }, { viscosityMpaS: -2 }, { velocityMmS: "not a number" },
                         { surfaceTensionMnM: Infinity }, { cellConcentrationPerMl: -1 }]) {
    assert.throws(() => calculate({ ...reference, ...changed }), RangeError);
  }
});
test("rule check is deterministic and never claims a signed audit", () => {
  const res = evaluateRules({ primary_metric: 28, secondary_metric: 14, status_descriptor: "DISCORDANT",
                              is_critical_flag: true });
  assert.equal(res.status, "CRITICAL_STAT_PANIC");
  assert.equal(res.alerts.length, 3);
  assert.equal(res.verified, false);
  assert.equal(evaluateRules({ primary_metric: 0, secondary_metric: 0 }).status, "ROUTINE");
});
