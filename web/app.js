"use strict";
(() => {
  const { calculate, evaluateRules } = window.DropletMath;
  const calculator = document.getElementById("calculator");
  const audit = document.getElementById("rules");
  const report = document.getElementById("report");
  const error = document.getElementById("error");
  const ruleOutput = document.getElementById("rule-output");
  let current = null;

  function inputs(form, ids) {
    return Object.fromEntries(ids.map(id => [id, form.elements.namedItem(id).value]));
  }
  function format(x, digits = 4) {
    return Number(x).toLocaleString("en-US", { maximumSignificantDigits: digits });
  }
  function setResult(key, text) {
    document.getElementById(key).textContent = text;
  }
  function runCalculation(event) {
    if (event) event.preventDefault();
    try {
      const values = inputs(calculator, [
        "diameterUm", "viscosityMpaS", "velocityMmS", "surfaceTensionMnM",
        "densityKgM3", "hydraulicDiameterUm", "dispersedFlowUlMin", "cellConcentrationPerMl",
      ]);
      current = { inputs: values, outputs: calculate(values) };
      const r = current.outputs;
      setResult("volume", format(r.dropletVolumeUl, 6) + " µL");
      setResult("capillary", format(r.capillaryNumber, 5));
      setResult("reynolds", format(r.reynoldsNumber, 5));
      setResult("frequency", format(r.dropletFrequencyHz, 5) + " Hz");
      setResult("lambda", format(r.lambda, 5));
      setResult("pzero", format(r.pZero * 100, 5) + "%");
      setResult("pone", format(r.pOne * 100, 5) + "%");
      setResult("pmultiple", format(r.pMultiple * 100, 5) + "%");
      setResult("occupied", format(r.singleCellAmongOccupied * 100, 5) + "%");
      error.textContent = "";
      report.hidden = false;
      document.getElementById("export").disabled = false;
    } catch (e) {
      report.hidden = true;
      current = null;
      document.getElementById("export").disabled = true;
      error.textContent = e.message || "Invalid calculation input.";
    }
  }
  function runRules(event) {
    event.preventDefault();
    try {
      const values = inputs(audit, ["primary_metric", "secondary_metric", "status_descriptor"]);
      values.is_critical_flag = audit.elements.namedItem("is_critical_flag").checked;
      const result = evaluateRules(values);
      ruleOutput.textContent = "Local demonstration — unsigned, not a clinical or GMP validation.\n" +
        "Rule status: " + result.status + "\n" +
        (result.alerts.length ? result.alerts.map((x, i) => (i + 1) + ". " + x).join("\n") : "No rule thresholds triggered.");
    } catch (e) {
      ruleOutput.textContent = "Rule-check error: " + e.message;
    }
  }
  function exportCsv() {
    if (!current) return;
    const data = { ...current.inputs, ...current.outputs };
    const values = Object.values(data).map(v => '"' + String(v).replaceAll('"', '""') + '"');
    const csv = Object.keys(data).join(",") + "\n" + values.join(",") + "\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "droplet-calculation.csv";
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  calculator.addEventListener("submit", runCalculation);
  audit.addEventListener("submit", runRules);
  document.getElementById("export").addEventListener("click", exportCsv);
  runCalculation();
})();
