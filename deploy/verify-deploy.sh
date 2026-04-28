#!/usr/bin/env bash
# ============================================================
# AcademiaFlow Appliance — Deploy Verification Checklist
# ============================================================
# Run this script AFTER docker compose up to verify the deploy.
# Usage: ./verify-deploy.sh
# ============================================================

set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; FAILURES=$((FAILURES+1)); }
warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; }

FAILURES=0

echo ""
echo "═══════════════════════════════════════════════"
echo " AcademiaFlow Appliance Deploy Verification"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Container Health ──
echo "── Container Health ──"
for svc in academiaflow_mongo academiaflow_api academiaflow_redis academiaflow_worker academiaflow_web; do
  status=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "missing")
  if [ "$status" = "healthy" ]; then
    pass "$svc is healthy"
  else
    fail "$svc status: $status"
  fi
done
echo ""

# ── 2. API Ping ──
echo "── API Reachability ──"
if curl -sf http://localhost:80/api/ping > /dev/null 2>&1; then
  pass "API responds to /api/ping"
else
  fail "API not reachable at /api/ping"
fi
echo ""

# ── 3. SIAGE Pilot Policy ──
echo "── SIAGE Pilot Policy ──"
PILOT_ENV=$(docker exec academiaflow_api sh -c 'echo $SIAGE_PILOT_BIMESTERS' 2>/dev/null)
if [ -z "$PILOT_ENV" ]; then
  warn "SIAGE_PILOT_BIMESTERS is NOT SET in container (will default based on code)"
else
  pass "SIAGE_PILOT_BIMESTERS='$PILOT_ENV' is configured"
fi

# Verify API policy endpoint
TOKEN=$(curl -sf -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"secretaria@academiaflow.com","password":"123456"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  POLICY=$(curl -sf http://localhost:80/api/siage/pilot-policy \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "{}")
  IS_RESTRICTED=$(echo "$POLICY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('isRestricted','?'))" 2>/dev/null || echo "?")
  ALLOWED=$(echo "$POLICY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('allowedBimesters','?'))" 2>/dev/null || echo "?")

  if [ "$IS_RESTRICTED" = "True" ]; then
    pass "Policy active: restricted to bimesters $ALLOWED"
  elif [ "$IS_RESTRICTED" = "False" ]; then
    warn "Policy: ALL bimesters unlocked (no pilot restriction)"
  else
    fail "Could not read pilot policy from API"
  fi
else
  fail "Could not authenticate to check pilot policy"
fi
echo ""

# ── 4. APP_MODE ──
echo "── Application Mode ──"
APP_MODE=$(docker exec academiaflow_api sh -c 'echo $APP_MODE' 2>/dev/null)
if [ "$APP_MODE" = "school_production" ]; then
  pass "APP_MODE=school_production (hardened)"
else
  warn "APP_MODE='$APP_MODE' (not school_production)"
fi
echo ""

# ── 5. Summary ──
echo "═══════════════════════════════════════════════"
if [ "$FAILURES" -eq 0 ]; then
  echo -e " ${GREEN}ALL CHECKS PASSED${NC}"
else
  echo -e " ${RED}$FAILURES CHECK(S) FAILED${NC}"
fi
echo "═══════════════════════════════════════════════"
echo ""

exit "$FAILURES"
