# Microfluidic Droplet Generator

> **Domain:** Clinical Decision Support & Biomedical Computing
> **Reference Standards:** CAP / CLSI / ISO Standards

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB.svg?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg?logo=fastapi&logoColor=white)
![Audit Trail](https://img.shields.io/badge/Audit-HMAC--SHA256_Tamper--Evident-brightgreen.svg)
![Zero-PHI Guard](https://img.shields.io/badge/Guard-Zero--PHI_Outbound-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)

</div>

---

## Overview

Microfluidic Droplet Generator is a multi-agent evaluation platform that processes task payloads through specialized worker agents to produce consensus dossiers with cryptographic audit trails. It provides:

- **Multi-Worker Evaluation**: Three specialized workers (InvariantQC, SafetyEscalation, ProtocolConformance) evaluate each task
- **Zero-PHI Guard**: Prevents protected health information from leaving the system
- **HMAC-SHA256 Audit Trail**: Tamper-evident cryptographic logging of all operations
- **FastAPI REST API**: HTTP endpoints for integration with external systems
- **Batch Processing**: CSV-based batch evaluation with error handling

---

## Installation

```bash
# Clone the repository
git clone https://github.com/abusuraihsakhri/microfluidic-droplet-generator.git
cd microfluidic-droplet-generator

# Install dependencies
pip install fastapi uvicorn pydantic pytest

# Set required environment variable
export AUDIT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
```

---

## Usage

### CLI Commands

#### Single Task Evaluation
```bash
python cli.py audit --task-id TASK-001 --target KEY-01 --primary 28.5 --secondary 14.2 --critical --status DISCORDANT
```

#### Batch Processing
```bash
python cli.py batch -i sample.csv -o results.csv
```

#### Chat Query
```bash
python cli.py chat "What is the system status?"
```

#### Verify Audit Trail
```bash
python cli.py verify-audit
```

#### Start REST Server
```bash
python cli.py serve --host 127.0.0.1 --port 8000
```

### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |
| POST | `/api/audit` | Submit task for evaluation |
| POST | `/api/chat` | Query supervisory chat |
| GET | `/api/audit/logs` | Retrieve audit trail |

### Input Data Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | string | Yes | Unique task identifier |
| `target_identifier` | string | Yes | Target entity key |
| `primary_metric` | float | Yes | Primary measurement value |
| `secondary_metric` | float | No | Secondary metric (default: 0.0) |
| `status_descriptor` | string | No | Status code (default: NOMINAL) |
| `is_critical_flag` | bool | No | Emergency escalation flag |

---

## Testing

```bash
# Run all tests
pytest -v

# Run with coverage
pytest -v --cov=agents --cov=droplet_microfluidics
```

---

## Simulation

Run high-throughput simulation benchmarks:

```bash
python simulator.py 1000
```

---

## Docker Deployment

```bash
# Copy environment template
cp .env.example .env
# Edit .env with your secure values

# Build and run
docker compose up --build
```

Or manually:

```bash
docker build -t microfluidic-droplet-generator .
docker run -p 8000:8000 --env-file .env microfluidic-droplet-generator
```

---

## Security

- **Zero-PHI Outbound Interceptor**: Active regex inspection blocking SSNs, MRNs, phone numbers, and patient identifiers
- **HMAC-SHA256 Audit Trail**: Chained, cryptographically signed logs
- **Path Traversal Protection**: All file paths validated against working directory
- **Input Validation**: NaN/Infinity values rejected; finite number enforcement

---

## License

MIT License - see [LICENSE](LICENSE) for details.
