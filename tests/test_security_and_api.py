"""Regression tests for signed audit entries and the HTTP boundary."""
import pytest
from agents.base import AuditTrail
from agents.models import SystemTaskPayload
from agents.supervisor import SystemSupervisor


def test_audit_detects_modified_signed_field():
    trail = AuditTrail(secret_key="test-only-key-longer-than-sixteen")
    trail.log("tester", "test", "created", {"task": "A"})
    trail.log("tester", "test", "completed", {"task": "B"})
    assert trail.verify_integrity()
    trail.logs[0]["event_type"] = "forged"
    assert not trail.verify_integrity()


def test_audit_snapshot_not_mutable():
    trail = AuditTrail(secret_key="test-only-key-longer-than-sixteen")
    trail.log("tester", "test", "created", {"task": "A"})
    leaked = trail.get_trail()
    leaked[0]["event_type"] = "forged"
    leaked.clear()
    assert len(trail.get_trail()) == 1
    assert trail.verify_integrity()


def test_audit_detects_modified_signature():
    trail = AuditTrail(secret_key="test-only-key-longer-than-sixteen")
    trail.log("tester", "test", "created", {"task": "A"})
    trail.logs[0]["current_hash"] = "0" * 64
    assert not trail.verify_integrity()


def test_api_rejects_sensitive_identifier(monkeypatch):
    from fastapi.testclient import TestClient
    from agents.api import app

    client = TestClient(app)
    response = client.post("/api/audit", json={
        "task_id": "MRN-994827", "target_identifier": "KEY-1",
        "primary_metric": 1, "secondary_metric": 0, "status_descriptor": "NOMINAL"
    })
    assert response.status_code == 422
    assert "Sensitive identifier" in response.json()["detail"]


def test_metrics_are_prometheus_text():
    from fastapi.testclient import TestClient
    from agents.api import app
    client = TestClient(app)
    response = client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "system_tasks_total" in response.text
