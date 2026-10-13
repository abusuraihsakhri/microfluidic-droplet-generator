/* Dimensionally explicit, idealized droplet calculations; no external dependencies. */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.DropletMath = api;
})(typeof globalThis !== "undefined" ? globalThis : undefined, function () {
    "use strict";
    function number(value, name, allowZero) {
        const n = Number(value);
        if (value === "" || value == null || !Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) {
            throw new RangeError(name + " must be a finite " + (allowZero ? "nonnegative" : "positive") + " number.");
        }
        return n;
    }

    function calculate(input) {
        const diameterUm = number(input.diameterUm, "Droplet diameter");
        const viscosityMpaS = number(input.viscosityMpaS, "Dynamic viscosity");
        const velocityMmS = number(input.velocityMmS, "Mean flow velocity");
        const surfaceTensionMnM = number(input.surfaceTensionMnM, "Interfacial tension");
        const densityKgM3 = number(input.densityKgM3, "Fluid density");
        const hydraulicDiameterUm = number(input.hydraulicDiameterUm, "Hydraulic diameter");
        const dispersedFlowUlMin = number(input.dispersedFlowUlMin, "Dispersed-phase flow", true);
        const cellConcentrationPerMl = number(input.cellConcentrationPerMl, "Cell concentration", true);

        // A spherical droplet, 1 µm^3 = 10^-9 µL.
        const dropletVolumeUl = Math.PI * Math.pow(diameterUm, 3) / 6e9;
        const dynamicViscosityPaS = viscosityMpaS * 1e-3;
        const velocityMS = velocityMmS * 1e-3;
        const capillaryNumber = dynamicViscosityPaS * velocityMS / (surfaceTensionMnM * 1e-3);
        const reynoldsNumber = densityKgM3 * velocityMS * (hydraulicDiameterUm * 1e-6) / dynamicViscosityPaS;
        const lambda = cellConcentrationPerMl / 1000 * dropletVolumeUl;
        const pZero = Math.exp(-lambda);
        const pOne = lambda * pZero;
        const pMultiple = Math.max(0, -Math.expm1(-lambda) - pOne);
        const dropletFrequencyHz = dispersedFlowUlMin / (60 * dropletVolumeUl);
        const result = {
            dropletVolumeUl, capillaryNumber, reynoldsNumber, lambda,
            pZero, pOne, pMultiple, dropletFrequencyHz,
            singleCellAmongOccupied: pZero === 1 ? 0 : pOne / (1 - pZero),
        };
        if (!Object.values(result).every(Number.isFinite)) {
            throw new RangeError("Result exceeds numeric range; reduce extreme input values.");
        }
        return result;
    }

    function evaluateRules(input) {
        const primary = number(input.primary_metric, "Primary metric", true);
        const secondary = number(input.secondary_metric, "Secondary metric", true);
        const descriptor = String(input.status_descriptor || "NOMINAL");
        const criticalFlag = input.is_critical_flag === true;
        const alerts = [];
        if (primary > 25) alerts.push("Primary metric exceeds the demonstration threshold (25).");
        if (secondary > 12 || criticalFlag) alerts.push("Secondary metric exceeds 12 or the critical flag is set.");
        if (["DISCORDANT", "ANOMALY", "MUTANT", "VIOLATION", "FAIL", "REJECT"]
            .some(term => descriptor.toUpperCase().includes(term))) {
            alerts.push("Status descriptor matches an anomaly keyword.");
        }
        return {
            status: criticalFlag ? "CRITICAL_STAT_PANIC" : alerts.length ? "ELEVATED_RISK" : "ROUTINE",
            alerts, verified: false,
        };
    }

    return { calculate, evaluateRules };
});
