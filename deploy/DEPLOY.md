# AcademiaFlow Appliance — Deploy Guide

## Directory Structure

```
deploy/                      # ← THIS directory (versionable)
├── .env.template            # Environment template with docs
├── verify-deploy.sh         # Post-deploy verification script  
├── docker-compose.yml       # Compose definition (source of truth)
└── DEPLOY.md                # This file

appliance_v1.4.0_release/    # ← LOCAL ONLY (gitignored)
├── .env.production          # Real secrets (NEVER committed)
├── docker-compose.yml       # Copied from deploy/
├── verify-deploy.sh         # Copied from deploy/
└── scripts/                 # Boot scripts
```

## What Is Versioned vs. What Is Local

| Artifact | Location | Versioned? |
|---|---|---|
| `docker-compose.yml` | `deploy/` | ✅ Yes |
| `.env.template` | `deploy/` | ✅ Yes |
| `verify-deploy.sh` | `deploy/` | ✅ Yes |
| `DEPLOY.md` | `deploy/` | ✅ Yes |
| `.env.production` | `appliance_*/` | ❌ Local only |
| Docker images (`.tar.gz`) | `appliance_*/` | ❌ Local only |

## Initial Setup

```bash
# 1. Create appliance directory
mkdir -p appliance_v1.4.0_release

# 2. Copy versioned files
cp deploy/docker-compose.yml appliance_v1.4.0_release/
cp deploy/.env.template appliance_v1.4.0_release/.env.production
cp deploy/verify-deploy.sh appliance_v1.4.0_release/

# 3. Edit .env.production with real secrets
nano appliance_v1.4.0_release/.env.production

# 4. Build images (from repo root)
docker build -t academiaflow_api:appliance-v1.4.0 -f apps/api/Dockerfile .
docker build -t academiaflow_web:appliance-v1.4.0 -f apps/web/Dockerfile .
docker build -t academiaflow_worker:appliance-v1.4.0 -f apps/worker-siage/Dockerfile .

# 5. Start
cd appliance_v1.4.0_release
docker compose up -d

# 6. Verify
./verify-deploy.sh
```

## SIAGE Pilot Policy Management

### Current Policy

The SIAGE module supports bimesters 1–4 as **product capability**. The **pilot restriction** limits which bimesters are operationally active.

| `SIAGE_PILOT_BIMESTERS` | Meaning |
|---|---|
| `1` | Pilot: only 1st bimester (current) |
| `1,2` | Expanded pilot |
| `1,2,3,4` or `''` | Full capability |

### Policy Promotion Procedure

1. **Authorization**: Obtain written approval from the project operator
2. **Edit**: Update `SIAGE_PILOT_BIMESTERS` in `.env.production`
3. **Restart**: `docker compose restart api`
4. **Verify API**: `curl /api/siage/pilot-policy` → check `allowedBimesters`
5. **Verify Script**: `./verify-deploy.sh` → ALL CHECKS PASSED
6. **Log**: Document the change with date, who authorized, and new value

### Config Validation

The API handles invalid config values gracefully:
- Garbage values → fallback to all bimesters + console.warn
- Out-of-range numbers (0, 5, 99) → silently filtered
- Empty string → full capability

## Update Procedure

When deploying new code to the appliance:

```bash
# From the repo root (after git pull)
git log -1 --oneline  # Confirm HEAD

# Rebuild affected images
docker build -t academiaflow_api:appliance-v1.4.0 -f apps/api/Dockerfile .

# Redeploy
cd appliance_v1.4.0_release
docker compose up -d api

# Verify
./verify-deploy.sh
```

## UNMATCHED Taxonomy

The SIAGE matching engine classifies unmatched items into 3 categories:

| Reason | Description | Treatment |
|---|---|---|
| `DOM_PLACEHOLDER` | Scraping artifact (`-`, empty) | Batch dismiss |
| `NAME_MISMATCH` | Similar name exists locally | Manual resolution |
| `NO_LOCAL_STUDENT` | No match in local cadastro | Institutional decision |

> **Note**: `UNMATCHED` ≠ `notRegistered`. `notRegistered` means the student was matched but has null grade in SIAGE.
