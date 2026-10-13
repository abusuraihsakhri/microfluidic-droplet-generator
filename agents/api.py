"""
FastAPI REST API Server for Microfluidic Droplet Generator.
"""
import time
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from .base import AuditLogger, PHIGuard, SecurityException
from .models import SystemTaskPayload, ConsensusDossier
from .supervisor import SystemSupervisor
from .metrics import GLOBAL_METRICS

supervisor = SystemSupervisor(model_provider="mock")

app = FastAPI(
    title="Microfluidic Droplet Generator API",
    description="Enterprise Distributed Component Platform (Clinical & Biomedical AI)",
    version="3.0.0-ENTERPRISE",
)


class ChatRequest(BaseModel):
    query: str


@app.exception_handler(SecurityException)
async def rejected_identifier(request: Request, exc: SecurityException):
    GLOBAL_METRICS.record_phi_block()
    return JSONResponse(
        status_code=422,
        content={"detail": "Sensitive identifier detected; use de-identified inputs."},
    )


@app.get("/health")
def health():
    return {"status": "HEALTHY", "service": "microfluidic-droplet-generator", "domain": "Clinical & Biomedical AI", "standard": "CAP / CLSI / ISO Standards", "version": "3.0.0-ENTERPRISE"}


@app.get("/metrics", response_class=PlainTextResponse)
def metrics():
    return GLOBAL_METRICS.export_prometheus_text()


@app.post("/api/audit")
def api_audit(payload: SystemTaskPayload):
    started = time.perf_counter()
    dossier = supervisor.process_task(payload)
    GLOBAL_METRICS.record_task(dossier.overall_urgency.value, time.perf_counter() - started)
    return dossier.to_dict()


@app.post("/api/chat")
def api_chat(req: ChatRequest):
    try:
        ans = supervisor.query_supervisory_chat(req.query)
        return {"response": ans}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/audit/logs")
def api_audit_logs():
    return {"audit_trail": AuditLogger.get_trail(), "verified": AuditLogger.verify_integrity()}
