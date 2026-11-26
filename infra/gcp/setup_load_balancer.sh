#!/usr/bin/env bash
# =============================================================================
# ClauseGuard — Cloud Run + External Application Load Balancer + Cloud Armor
# =============================================================================
# Idempotent-ish provisioning script. Read it before running; run step by step
# the first time (`STEP=<name> ./setup_load_balancer.sh` runs a single step).
#
# Prerequisites (one-off, done by hand):
#   - gcloud authenticated as a project Owner/Editor
#   - Cloud SQL instance exists (clauseguard-db, europe-west1)
#   - Secrets created in Secret Manager:
#       cg-database-url        mysql+aiomysql://USER:PW@/clauseguard?unix_socket=/cloudsql/PROJECT:europe-west1:clauseguard-db
#       cg-database-url-sync   mysql+pymysql://USER:PW@/clauseguard?unix_socket=/cloudsql/PROJECT:europe-west1:clauseguard-db
#       cg-gemini-api-key      Gemini API key
#   - You control DNS for clauseguard.ie
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../../Development/backend"

# Load deploy.env when it exists, so releases never depend on remembering to
# `source` it. A value already exported in the shell still wins. Plain KEY=value
# lines only (no quotes, no trailing comments).
if [[ -f "${SCRIPT_DIR}/deploy.env" ]]; then
  while IFS='=' read -r _key _val; do
    [[ "${_key}" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
    if [[ -z "$(eval "echo \${${_key}+set}")" ]]; then
      export "${_key}=${_val}"
    fi
  done < "${SCRIPT_DIR}/deploy.env"
fi

# Fall back to the backend .env (GCP_PROJECT_ID / DOC_AI_PROCESSOR_ID) when the
# deploy variables are not exported. Reads only these two keys.
_from_backend_env() {
  [[ -f "${BACKEND_DIR}/.env" ]] || return 0
  grep -E "^$1=" "${BACKEND_DIR}/.env" | head -1 | cut -d= -f2- | tr -d "\"' "
}
PROJECT_ID="${PROJECT_ID:-$(_from_backend_env GCP_PROJECT_ID)}"
DOC_AI_PROCESSOR_ID="${DOC_AI_PROCESSOR_ID:-$(_from_backend_env DOC_AI_PROCESSOR_ID)}"

# Firebase Auth project (may differ from PROJECT_ID). Falls back to the
# frontend's NEXT_PUBLIC_FIREBASE_PROJECT_ID, then to PROJECT_ID.
_from_frontend_env() {
  local f="${SCRIPT_DIR}/../../Development/frontend/.env.local"
  [[ -f "$f" ]] || return 0
  grep -E "^$1=" "$f" | head -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//' | tr -d "\"' "
}
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-$(_from_frontend_env NEXT_PUBLIC_FIREBASE_PROJECT_ID)}"
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-${PROJECT_ID:-}}"

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
REGION="${REGION:-europe-west1}"            # Belgium. GCP has no Irish region.
DOMAIN="${DOMAIN:-api.clauseguard.ie}"
SQL_INSTANCE="${SQL_INSTANCE:-clauseguard-db}"
BUCKET="${BUCKET:-clauseguard-leases-prod}"
DOCAI_IN_BUCKET="${DOCAI_IN_BUCKET:-clauseguard-docs-in}"    # Document AI staging (raw upload)
DOCAI_OUT_BUCKET="${DOCAI_OUT_BUCKET:-clauseguard-docs-out}" # Document AI staging (OCR output)
DOC_AI_PROCESSOR_ID="${DOC_AI_PROCESSOR_ID:?set DOC_AI_PROCESSOR_ID}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://clauseguard.ie,https://www.clauseguard.ie}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"         # set 1 on demo days only
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"

SERVICE="clauseguard-api"
SA_NAME="clauseguard-api"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
REPO="clauseguard"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/api:${TAG}"
SQL_CONN="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

gcloud config set project "${PROJECT_ID}" >/dev/null

# ── 1. APIs ──────────────────────────────────────────────────────────────────
step_apis() {
  gcloud services enable \
    run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com \
    compute.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com \
    storage.googleapis.com documentai.googleapis.com dlp.googleapis.com
}

# ── 2. Runtime service account + least-privilege roles ───────────────────────
# A just-created service account takes a few seconds (sometimes ~1 min) to
# become visible to IAM, so a binding can fail with "does not exist". Retry.
_bind_role() {  # _bind_role <project> <role>
  local attempt
  for attempt in 1 2 3 4 5 6 7 8; do
    if gcloud projects add-iam-policy-binding "$1" \
         --member="serviceAccount:${SA}" --role="$2" --condition=None >/dev/null 2>&1; then
      echo "  granted $2 on $1"
      return 0
    fi
    echo "  $2 on $1 not applied yet (attempt ${attempt}/8), waiting 10s..."
    sleep 10
  done
  # Final attempt with errors visible
  gcloud projects add-iam-policy-binding "$1" \
    --member="serviceAccount:${SA}" --role="$2" --condition=None >/dev/null
}

step_iam() {
  gcloud iam service-accounts describe "${SA}" >/dev/null 2>&1 || \
    gcloud iam service-accounts create "${SA_NAME}" --display-name="ClauseGuard API runtime"
  for role in roles/cloudsql.client roles/documentai.apiUser roles/dlp.user \
              roles/secretmanager.secretAccessor; do
    _bind_role "${PROJECT_ID}" "${role}"
  done
  # Firebase Auth admin (revoke tokens, get user, password-reset links) is
  # granted in the FIREBASE project, which may be a different project.
  # Token verification itself needs no IAM, only the correct project ID.
  for role in roles/firebaseauth.admin roles/serviceusage.serviceUsageConsumer; do
    _bind_role "${FIREBASE_PROJECT_ID}" "${role}"
  done
}

# ── 3. Buckets: redacted lease text + Document AI staging ────────────────────
step_bucket() {
  gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1 || \
    gcloud storage buckets create "gs://${BUCKET}" --location="${REGION}" \
      --uniform-bucket-level-access --public-access-prevention --soft-delete-duration=7d

  # Staging buckets hold the RAW (unredacted) upload and OCR output for a few
  # seconds. The app deletes them; a 1-day lifecycle rule is the safety net.
  printf '{"rule":[{"action":{"type":"Delete"},"condition":{"age":1}}]}' > /tmp/cg-staging-lifecycle.json
  for b in "${DOCAI_IN_BUCKET}" "${DOCAI_OUT_BUCKET}"; do
    gcloud storage buckets describe "gs://${b}" >/dev/null 2>&1 || \
      gcloud storage buckets create "gs://${b}" --location=EU \
        --uniform-bucket-level-access --public-access-prevention --soft-delete-duration=0
    gcloud storage buckets update "gs://${b}" --lifecycle-file=/tmp/cg-staging-lifecycle.json
  done

  # App service account: read/write/delete in all three buckets.
  for b in "${BUCKET}" "${DOCAI_IN_BUCKET}" "${DOCAI_OUT_BUCKET}"; do
    gcloud storage buckets add-iam-policy-binding "gs://${b}" \
      --member="serviceAccount:${SA}" --role=roles/storage.objectAdmin >/dev/null
  done

  # Document AI's own service agent reads the input and writes the output.
  local num; num="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  local dai="serviceAccount:service-${num}@gcp-sa-prod-dai-core.iam.gserviceaccount.com"
  gcloud storage buckets add-iam-policy-binding "gs://${DOCAI_IN_BUCKET}" \
    --member="${dai}" --role=roles/storage.objectViewer >/dev/null
  gcloud storage buckets add-iam-policy-binding "gs://${DOCAI_OUT_BUCKET}" \
    --member="${dai}" --role=roles/storage.objectAdmin >/dev/null
}

# ── 4. Build image into Artifact Registry (gcr.io is retired) ────────────────
step_build() {
  gcloud artifacts repositories describe "${REPO}" --location="${REGION}" >/dev/null 2>&1 || \
    gcloud artifacts repositories create "${REPO}" --repository-format=docker --location="${REGION}"
  gcloud builds submit "${BACKEND_DIR}" --tag="${IMAGE}"
  echo "${IMAGE}" > "${SCRIPT_DIR}/.last_image"
}

_image() { cat "${SCRIPT_DIR}/.last_image" 2>/dev/null || echo "${IMAGE}"; }

_common_env="GCP_PROJECT_ID=${PROJECT_ID},GCP_LOCATION=eu,DOC_AI_PROCESSOR_ID=${DOC_AI_PROCESSOR_ID},GCS_BUCKET_NAME=${BUCKET},GCS_INPUT_BUCKET=${DOCAI_IN_BUCKET},GCS_OUTPUT_BUCKET=${DOCAI_OUT_BUCKET},FIREBASE_CREDENTIALS_JSON=,FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}"
_common_secrets="DATABASE_URL=cg-database-url:latest,DATABASE_URL_SYNC=cg-database-url-sync:latest,GEMINI_API_KEY=cg-gemini-api-key:latest"

# ── 5. Migrations as a Cloud Run Job (never on service start-up) ─────────────
step_migrate() {
  local img; img="$(_image)"
  if gcloud run jobs describe clauseguard-migrate --region="${REGION}" >/dev/null 2>&1; then
    verb=update
  else
    verb=create
  fi
  gcloud run jobs "${verb}" clauseguard-migrate --region="${REGION}" --image="${img}" \
    --service-account="${SA}" --set-cloudsql-instances="${SQL_CONN}" \
    --set-env-vars="${_common_env}" --set-secrets="${_common_secrets}" \
    --command=alembic --args=upgrade,head --max-retries=0 --task-timeout=600s
  gcloud run jobs execute clauseguard-migrate --region="${REGION}" --wait
}

# ── 6. Cloud Run service — reachable ONLY through the load balancer ──────────
# Trained clause classifier (optional). Set MODEL_BUCKET to mount that private
# bucket read-only at /models and point CLAUSE_MODEL_PATH at MODEL_FILE. Leave it
# empty and the backend uses the keyword classifier. It lives here, not in a
# one-off `gcloud run services update`, because --set-env-vars below replaces
# every variable, so a variable set by hand would vanish at the next release.
# Bucket mounts need the second-generation execution environment.
_model_flags=()
_model_env=""
if [[ -n "${MODEL_BUCKET:-}" ]]; then
  _model_flags=(
    --execution-environment=gen2
    --add-volume="name=models,type=cloud-storage,bucket=${MODEL_BUCKET},readonly=true"
    --add-volume-mount="volume=models,mount-path=/models"
  )
  _model_env=",CLAUSE_MODEL_PATH=/models/${MODEL_FILE:-clause_classifier_v2.joblib}"
fi

# Env vars use gcloud's "^@^" delimiter (see `gcloud topic escaping`) because
# ALLOWED_ORIGINS holds a comma-separated list; plain commas would split it.
step_service() {
  gcloud run deploy "${SERVICE}" --region="${REGION}" --image="$(_image)" \
    --service-account="${SA}" \
    --ingress=internal-and-cloud-load-balancing \
    --allow-unauthenticated \
    --cpu=2 --memory=2Gi --concurrency=10 --timeout=300 \
    --min-instances="${MIN_INSTANCES}" --max-instances=5 \
    --add-cloudsql-instances="${SQL_CONN}" \
    --set-env-vars="^@^${_common_env//,/@}@RUN_MIGRATIONS=false@TRUSTED_PROXY_COUNT=1@ALLOWED_ORIGINS=${ALLOWED_ORIGINS}${_model_env//,/@}" \
    --set-secrets="${_common_secrets}" \
    ${_model_flags[@]+"${_model_flags[@]}"} \
    --startup-probe=httpGet.path=/health,initialDelaySeconds=5,periodSeconds=5,failureThreshold=12 \
    --liveness-probe=httpGet.path=/health,periodSeconds=30,failureThreshold=3
}

# ── 7. Load balancer: IP, serverless NEG, backend, cert, proxies, rules ──────
step_lb() {
  gcloud compute addresses describe cg-lb-ip --global >/dev/null 2>&1 || \
    gcloud compute addresses create cg-lb-ip --global --ip-version=IPV4

  gcloud compute network-endpoint-groups describe cg-serverless-neg --region="${REGION}" >/dev/null 2>&1 || \
    gcloud compute network-endpoint-groups create cg-serverless-neg --region="${REGION}" \
      --network-endpoint-type=serverless --cloud-run-service="${SERVICE}"

  # No --health-checks: serverless NEG backends do not support them.
  # Cloud Run's own startup/liveness probes cover health.
  gcloud compute backend-services describe cg-lb-backend --global >/dev/null 2>&1 || {
    gcloud compute backend-services create cg-lb-backend --global \
      --load-balancing-scheme=EXTERNAL_MANAGED --enable-logging --logging-sample-rate=1.0
    gcloud compute backend-services add-backend cg-lb-backend --global \
      --network-endpoint-group=cg-serverless-neg --network-endpoint-group-region="${REGION}"
  }

  gcloud compute url-maps describe cg-url-map >/dev/null 2>&1 || \
    gcloud compute url-maps create cg-url-map --default-service=cg-lb-backend

  gcloud compute ssl-certificates describe cg-ssl-cert --global >/dev/null 2>&1 || \
    gcloud compute ssl-certificates create cg-ssl-cert --global --domains="${DOMAIN}"

  gcloud compute target-https-proxies describe cg-https-proxy >/dev/null 2>&1 || \
    gcloud compute target-https-proxies create cg-https-proxy \
      --url-map=cg-url-map --ssl-certificates=cg-ssl-cert

  gcloud compute forwarding-rules describe cg-https-rule --global >/dev/null 2>&1 || \
    gcloud compute forwarding-rules create cg-https-rule --global \
      --load-balancing-scheme=EXTERNAL_MANAGED --address=cg-lb-ip \
      --target-https-proxy=cg-https-proxy --ports=443

  # HTTP -> HTTPS redirect (second forwarding rule on the same IP).
  if ! gcloud compute url-maps describe cg-http-redirect >/dev/null 2>&1; then
    cat > /tmp/cg-http-redirect.yaml <<EOF
name: cg-http-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF
    gcloud compute url-maps import cg-http-redirect --global --source=/tmp/cg-http-redirect.yaml --quiet
  fi
  gcloud compute target-http-proxies describe cg-http-proxy >/dev/null 2>&1 || \
    gcloud compute target-http-proxies create cg-http-proxy --url-map=cg-http-redirect
  gcloud compute forwarding-rules describe cg-http-rule --global >/dev/null 2>&1 || \
    gcloud compute forwarding-rules create cg-http-rule --global \
      --load-balancing-scheme=EXTERNAL_MANAGED --address=cg-lb-ip \
      --target-http-proxy=cg-http-proxy --ports=80

  echo
  echo "Create DNS A record:  ${DOMAIN}  ->  $(gcloud compute addresses describe cg-lb-ip --global --format='value(address)')"
  echo "The managed certificate turns ACTIVE 15-60 min after DNS resolves."
}

# ── 8. Cloud Armor: per-IP throttle + OWASP rules (preview first) ────────────
step_armor() {
  gcloud compute security-policies describe cg-armor >/dev/null 2>&1 || \
    gcloud compute security-policies create cg-armor --description="ClauseGuard API edge policy"

  # Global per-IP ceiling: 300 requests / minute -> 429. Backstop for the
  # per-instance in-app slowapi limits.
  gcloud compute security-policies rules describe 1000 --security-policy=cg-armor >/dev/null 2>&1 || \
    gcloud compute security-policies rules create 1000 --security-policy=cg-armor \
      --expression="true" --action=throttle \
      --rate-limit-threshold-count=300 --rate-limit-threshold-interval-sec=60 \
      --conform-action=allow --exceed-action=deny-429 --enforce-on-key=IP

  # OWASP rules start in PREVIEW (log only): lease uploads contain legal prose
  # that can trip SQLi/XSS signatures. Check logs for a week, then remove
  # --preview with: gcloud compute security-policies rules update 2000 --security-policy=cg-armor --no-preview
  gcloud compute security-policies rules describe 2000 --security-policy=cg-armor >/dev/null 2>&1 || \
    gcloud compute security-policies rules create 2000 --security-policy=cg-armor \
      --expression="evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})" \
      --action=deny-403 --preview
  gcloud compute security-policies rules describe 2001 --security-policy=cg-armor >/dev/null 2>&1 || \
    gcloud compute security-policies rules create 2001 --security-policy=cg-armor \
      --expression="evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 1})" \
      --action=deny-403 --preview

  gcloud compute backend-services update cg-lb-backend --global --security-policy=cg-armor
}

# ── 9. Verify ────────────────────────────────────────────────────────────────
step_verify() {
  local run_url; run_url="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --format='value(status.url)')"
  echo "Direct run.app URL must be blocked (expect 404/403):"
  curl -s -o /dev/null -w '%{http_code}\n' "${run_url}/health" || true
  echo "Through the load balancer (expect 200):"
  curl -s -o /dev/null -w '%{http_code}\n' "https://${DOMAIN}/health" || true
  gcloud compute ssl-certificates describe cg-ssl-cert --global --format='value(managed.status)'
}

ALL_STEPS="apis iam bucket build migrate service lb armor verify"
if [[ -n "${STEP:-}" ]]; then
  "step_${STEP}"
else
  for s in ${ALL_STEPS}; do echo "== ${s} =="; "step_${s}"; done
fi
