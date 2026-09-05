"""
Automated Pytest Test Suite for Microfluidic Droplet Generator.
Domain: Clinical & Biomedical AI
Standard: CAP / CLSI / ISO Standards
"""
import math
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from agents.base import PHIGuard, AuditLogger, SecurityException, AuditTrail
from agents.models import SystemTaskPayload, UrgencyLevel, SystemIntegrityStatus
from agents.workers import InvariantQCWorker, SafetyEscalationWorker, ProtocolConformanceWorker
from agents.supervisor import SystemSupervisor
from cli import main, _safe_resolve_path


def test_phi_guard_enforcement():
    with pytest.raises(SecurityException):
        PHIGuard.assert_no_phi("Patient MRN-994827 blood culture positive for Staphylococcus")

    # Clean text passes
    PHIGuard.assert_no_phi("Analytical assay specimen KEY-001 optimal")


def test_specialized_workers():
    # Worker 1: QC Invariant
    p1 = SystemTaskPayload(task_id="T1", target_identifier="KEY-01", primary_metric=35.0)
    alerts1 = InvariantQCWorker.evaluate(p1)
    assert len(alerts1) == 1
    assert alerts1[0].urgency == UrgencyLevel.ELEVATED

    # Worker 2: Safety
    p2 = SystemTaskPayload(task_id="T2", target_identifier="KEY-02", primary_metric=10.0, is_critical_flag=True)
    alerts2 = SafetyEscalationWorker.evaluate(p2)
    assert len(alerts2) == 1
    assert alerts2[0].urgency == UrgencyLevel.CRITICAL_STAT

    # Worker 3: Protocol Conformance
    p3 = SystemTaskPayload(task_id="T3", target_identifier="KEY-03", primary_metric=10.0, status_descriptor="DISCORDANT_ANOMALY")
    alerts3 = ProtocolConformanceWorker.evaluate(p3)
    assert len(alerts3) == 1


def test_supervisor_consensus_and_audit():
    supervisor = SystemSupervisor(model_provider="mock")
    payload = SystemTaskPayload(
        task_id="TASK-PROD-01",
        target_identifier="KEY-PROD-01",
        primary_metric=12.0,
        secondary_metric=4.0,
        status_descriptor="NOMINAL"
    )
    dossier = supervisor.process_task(payload)
    assert dossier.overall_urgency == UrgencyLevel.ROUTINE
    assert dossier.integrity_status == SystemIntegrityStatus.VALIDATED
    assert dossier.audit_hash != ""

    # Verify cryptographic audit trail
    assert AuditLogger.verify_integrity() is True

    # CLI tests
    assert main(["audit", "--task-id", "CLI-TEST-01"]) == 0
    assert main(["chat", "Explain", "specifications"]) == 0
    assert main(["verify-audit"]) == 0


def test_nan_and_infinity_rejected():
    """NaN and Infinity values must be rejected by the payload validator."""
    with pytest.raises(ValueError, match="NaN|Infinity|finite"):
        SystemTaskPayload(task_id="T-NAN", target_identifier="KEY", primary_metric=float("nan"))

    with pytest.raises(ValueError, match="NaN|Infinity|finite"):
        SystemTaskPayload(task_id="T-INF", target_identifier="KEY", primary_metric=float("inf"))

    with pytest.raises(ValueError, match="NaN|Infinity|finite"):
        SystemTaskPayload(task_id="T-INF2", target_identifier="KEY", primary_metric=1.0, secondary_metric=float("-inf"))


def test_audit_trail_requires_secret_key():
    """AuditTrail must require AUDIT_SECRET_KEY env var or explicit key."""
    original = os.environ.pop("AUDIT_SECRET_KEY", None)
    try:
        with pytest.raises(EnvironmentError, match="AUDIT_SECRET_KEY"):
            AuditTrail()
    finally:
        if original is not None:
            os.environ["AUDIT_SECRET_KEY"] = original


def test_audit_trail_rejects_short_key():
    """AuditTrail must reject keys shorter than 16 characters."""
    with pytest.raises(ValueError, match="16 characters"):
        AuditTrail(secret_key="short")


def test_path_traversal_protection():
    """_safe_resolve_path must block directory traversal attempts."""
    with pytest.raises(ValueError, match="traversal"):
        _safe_resolve_path("../../../etc/passwd")

    with pytest.raises(ValueError, match="traversal"):
        _safe_resolve_path("/etc/passwd")


def test_safe_path_valid():
    """_safe_resolve_path must accept valid paths within working directory."""
    p = _safe_resolve_path("sample.csv", must_exist=True)
    assert p.exists()
    assert p.name == "sample.csv"


def test_batch_cli_path_traversal():
    """Batch CLI must reject path traversal attempts."""
    result = main(["batch", "-i", "../../../etc/passwd"])
    assert result == 1


def test_batch_cli_missing_file():
    """Batch CLI must handle missing input files gracefully."""
    result = main(["batch", "-i", "nonexistent_file_xyz.csv"])
    assert result == 1
