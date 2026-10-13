# Microfluidic Droplet Generator

A browser-based calculator for idealized droplet microfluidics, alongside the repository's existing Python rule-based telemetry evaluators, CLI, and FastAPI service.

## Browser calculator

Open `web/index.html` in a modern browser, or serve the directory with `python -m http.server 8001 --directory web` and visit `http://localhost:8001`. No Python runtime, remote API or package installation is needed for the browser calculator.

The browser UI calculates:

- **Droplet volume:** `V = (π/6) d³`, assuming a sphere (the UI converts µm³ to µL).
- **Capillary number:** `Ca = μU/γ`, using viscosity, mean velocity and interfacial tension.
- **Reynolds number:** `Re = ρUDh/μ`, using density, velocity and hydraulic diameter.
- **Droplet frequency estimate:** dispersed-phase volumetric flow divided by droplet volume.
- **Random cell occupancy:** `λ = cell_concentration × droplet_volume`; `P(0) = e^-λ`, `P(1) = λ e^-λ`, `P(≥2) = 1 - P(0) - P(1)`.

Use the **Calculate** button to update results, or **Export CSV** to save the inputs and outputs. A separate *Legacy telemetry threshold checker* retains the repository's demonstration rules; its output is local and **not** a cryptographically signed audit record.

The volume/frequency/Poisson calculations rely on spherical monodisperse droplets, ideal random loading, constant properties and no dispersed-phase losses. They do not predict droplet size from chip geometry, prove stable breakup regimes, control hardware, establish assay validity or demonstrate GMP compliance.

### Privacy and browser compatibility

The browser app is static HTML, CSS and JavaScript; calculations and CSV export occur locally. It sends no input data to a server and loads no remote assets. It is intended for modern evergreen desktop and mobile browsers with JavaScript enabled.

## Python evaluators

The existing modules provide **illustrative, rule-based telemetry screening**, not a calibrated microfluidic physics engine or clinical diagnostic system. In particular, the primary/secondary thresholds in `agents/` and `droplet_microfluidics/` are example thresholds, **not established CAP, CLSI, ISO, Drop-seq or GMP acceptance criteria**. The `enrichment.py` suite likewise contains generic rule-based checks rather than experimentally validated controllers or optimization models.

Requirements: Python 3.9+ (CI covers 3.10–3.12). Install from the repository root:

```bash
python -m pip install -e ".[server,test]"
export AUDIT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
```

The HMAC secret is required for the `agents/` implementation. Never commit the production key. The separate `droplet_microfluidics/` CLI does not use this HMAC audit service.

```bash
# Example audit and batch run
python cli.py audit --task-id TASK-001 --target SAMPLE-001 --primary 28.5 --secondary 14.2
python cli.py batch -i sample.csv -o results.csv
python cli.py verify-audit

# Alternative droplet_microfluidics rule evaluator
python -m droplet_microfluidics.cli audit --task-id TASK-002

# FastAPI and tests
python cli.py serve --host 127.0.0.1 --port 8000
python -m pytest -q
node --test web/calculator.test.cjs
```

### API

The default FastAPI service is `agents.api:app`:

| Route | Purpose |
| --- | --- |
| `GET /health` | Service metadata |
| `POST /api/audit` | Assess submitted numeric metrics using demonstration rules |
| `POST /api/chat` | Deterministic mock response; no live language model |
| `GET /metrics` | Prometheus text metrics |
| `GET /api/audit/logs` | In-memory HMAC-signed audit entry metadata and integrity check |

`AUDIT_SECRET_KEY` is required before importing the API. Audit entries are stored **in process memory**, not in durable storage; they disappear after a restart. HMAC verification detects changed signed fields or broken chain links, but does not verify external data provenance.

### Docker

Copy `.env.example` to `.env` and replace its sample key with a securely generated value before starting:

```bash
docker compose up --build
```

The compose file exposes port 8000. **Do not expose the API to an untrusted network without adding authentication, TLS, access controls and appropriate persistence.** The identifier filter is regex-based and incomplete; do not submit patient identifiers or other sensitive information. It is not a HIPAA de-identification guarantee.

## Development and deployment

The `master` branch runs Python test suites and dependency installation through GitHub Actions. The `web/` calculator uses native JavaScript (not Pyodide), so a static hosting target such as GitHub Pages is sufficient. `.github/workflows/pages.yml` publishes that directory after updates to `master`, subject to the repository's Pages configuration.

Project license: [MIT](LICENSE).
