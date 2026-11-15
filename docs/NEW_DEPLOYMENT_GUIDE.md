# ClauseGuard — GCP Deployment Guide

This guide deploys ClauseGuard entirely on Google Cloud: **Cloud Run** behind a **Global External Application Load Balancer** with **Cloud Armor**, **Cloud Storage** (replacing AWS S3), **Cloud SQL for MySQL**, **Secret Manager**, and **Firebase App Hosting** for the frontend. It replaces `DEPLOYMENT_GUIDE.md` (Render + Vercel + AWS).

Architecture, design decisions and cost: see [`LOAD_BALANCER_AND_CACHE_PLAN.md`](LOAD_BALANCER_AND_CACHE_PLAN.md).
Provisioning script: [`infra/gcp/setup_load_balancer.sh`](../infra/gcp/setup_load_balancer.sh).

---

## 0. Order of work

| # | Step | Section | Time |
| --: | :--- | :--- | :--- |
| 1 | Install tools, log in | §1 | 10 min |
| 2 | Confirm `PROJECT_ID`, `DOC_AI_PROCESSOR_ID`, `FIREBASE_PROJECT_ID` (already in `.env` files) | §2 | 2 min |
| 3 | Enable APIs (`STEP=apis`) | §4.1 | 2 min |
| 4 | Create the 3 secrets in Secret Manager | §3 | 15 min |
| 5 | Service account, buckets (`STEP=iam`, `STEP=bucket`) | §4.2–4.3 | 5 min |
| 6 | Copy lease files S3 → GCS | §5 | 15 min |
| 7 | Build, migrate, deploy Cloud Run (`build`, `migrate`, `service`) | §4.4–4.6 | 15 min |
| 8 | Load balancer (`STEP=lb`) | §4.7 | 5 min |
| 9 | Point `api.clauseguard.ie` DNS at the load balancer IP | §6 | 5 min + up to 60 min cert wait |
| 10 | Cloud Armor (`STEP=armor`), verify (`STEP=verify`) | §4.8–4.9 | 5 min |
| 11 | Frontend on Firebase App Hosting | §7 | 20 min |
| 12 | Post-deployment checklist, then decommission Render/AWS/Vercel | §8–9 | 30 min |

Secrets (step 4) come **after** enabling APIs because Secret Manager must be switched on before you can create anything in it.

---

## 1. Prerequisites

**What:** the Google Cloud CLI, logged in with an account that is Owner (or Editor + Security Admin) on the project.

**Why:** every step below is a `gcloud` command. Owner-level rights are needed once, to create service accounts and grant roles; the running app itself uses a least-privilege service account.

**How:**

```bash
# macOS
brew install --cask google-cloud-sdk
gcloud components update          # the script uses recent Cloud Run probe flags

gcloud auth login                 # opens a browser
gcloud auth application-default login   # only needed to run the backend locally
```

Also needed:
- The existing Cloud SQL instance `clauseguard-db` (MySQL 8.0, `europe-west1`) with database `clauseguard` and user `clauseguard_user`.
- Billing enabled on the project.
- Access to the DNS settings for `clauseguard.ie` at your domain registrar.
- Read access to the current AWS S3 bucket (for the one-off file copy).

---

## 2. `PROJECT_ID`, `DOC_AI_PROCESSOR_ID`, `FIREBASE_PROJECT_ID` (already set)

### What
**These are already set in the project; the script reads them automatically.** You only need to confirm them.

| Variable | Read from | Current value | Meaning |
| :--- | :--- | :--- | :--- |
| `PROJECT_ID` | `Development/backend/.env` → `GCP_PROJECT_ID` | `clauseguard-512316` | Project holding Cloud SQL, Document AI, DLP; everything new is created here |
| `DOC_AI_PROCESSOR_ID` | `Development/backend/.env` → `DOC_AI_PROCESSOR_ID` | `206399780f30e776` | Document AI OCR processor (location `eu`) |
| `FIREBASE_PROJECT_ID` | `Development/frontend/.env.local` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `clauseguard-d6e96` | Project holding Firebase Auth (**a different project**) |

Optional overrides (put them in `infra/gcp/deploy.env`, or export them):

| Variable | Default | Meaning |
| :--- | :--- | :--- |
| `REGION` | `europe-west1` | Cloud Run, Artifact Registry, lease bucket |
| `DOMAIN` | `api.clauseguard.ie` | Hostname on the TLS certificate |
| `SQL_INSTANCE` | `clauseguard-db` | Cloud SQL instance name |
| `BUCKET` | `clauseguard-leases-prod` | Redacted lease text |
| `DOCAI_IN_BUCKET` / `DOCAI_OUT_BUCKET` | `clauseguard-docs-in` / `-out` | Document AI staging buckets |
| `ALLOWED_ORIGINS` | `https://clauseguard.ie,https://www.clauseguard.ie` | CORS allow-list |
| `MIN_INSTANCES` | `0` | Set `1` on demo days to avoid cold starts |

A value exported in the shell or set in `deploy.env` wins over the `.env` files.

### Why
- The script stops if `PROJECT_ID` or `DOC_AI_PROCESSOR_ID` resolve to nothing, so it cannot create resources in the wrong project.
- `PROJECT_ID` is passed to Cloud Run as `GCP_PROJECT_ID`, which DLP and Document AI read. `DOC_AI_PROCESSOR_ID` tells `extractor.py` which OCR processor to call.
- **Two projects:** ClauseGuard's Firebase Auth lives in `clauseguard-d6e96`, while Cloud SQL and Document AI live in `clauseguard-512316`.
  - Login tokens are issued for `clauseguard-d6e96`, so Cloud Run must verify them against that project. The script passes `FIREBASE_PROJECT_ID` to Cloud Run for this; otherwise every request would get `401`.
  - `STEP=iam` grants the API's service account `firebaseauth.admin` **in the Firebase project**, so token revocation and password-reset links work. Your gcloud account needs Owner/IAM Admin on `clauseguard-d6e96` for that step.
- These are **not** secrets (an ID is useless without IAM access), so they are not in Secret Manager.

### How

**1. Confirm what the script will use** (from the repo root):

```bash
grep -E '^(GCP_PROJECT_ID|DOC_AI_PROCESSOR_ID|GCP_LOCATION)=' Development/backend/.env
grep -E '^NEXT_PUBLIC_FIREBASE_PROJECT_ID=' Development/frontend/.env.local
```

Expected: `clauseguard-512316`, `206399780f30e776`, `eu`, `clauseguard-d6e96`.

**2. Check that your gcloud account can reach both projects:**

```bash
gcloud projects describe clauseguard-512316 --format='value(projectId,lifecycleState)'
gcloud projects describe clauseguard-d6e96  --format='value(projectId,lifecycleState)'
gcloud config set project clauseguard-512316
```

Both should print `ACTIVE`.

**3. Optional overrides only.** Create `deploy.env` only if you want to change a default (e.g. `MIN_INSTANCES=1` for a demo):

```bash
cd infra/gcp
cp deploy.env.example deploy.env      # git-ignored; leave the three ID lines empty
set -a; source deploy.env; set +a
```

Without a `deploy.env`, just `cd infra/gcp` and run the steps.

---

## 3. Create the 3 secrets in Secret Manager

### What

| Secret name | Becomes env var | Value |
| :--- | :--- | :--- |
| `cg-database-url` | `DATABASE_URL` | `mysql+aiomysql://clauseguard_user:<PW>@/clauseguard?unix_socket=/cloudsql/<PROJECT_ID>:europe-west1:clauseguard-db` |
| `cg-database-url-sync` | `DATABASE_URL_SYNC` | `mysql+pymysql://clauseguard_user:<PW>@/clauseguard?unix_socket=/cloudsql/<PROJECT_ID>:europe-west1:clauseguard-db` |
| `cg-gemini-api-key` | `GEMINI_API_KEY` | Your Gemini API key from Google AI Studio |

### Why
- **No secrets in code, images or env files.** On Render, the DB password and API keys sat in the dashboard and in `.env`. Secret Manager stores them encrypted, versioned and audited. Only the `clauseguard-api` service account can read them.
- **Cloud Run injects them at start-up.** The script's `--set-secrets=DATABASE_URL=cg-database-url:latest,…` maps each secret to the env var the app already reads, so no code change is needed.
- **Two database URLs** because FastAPI uses the async `aiomysql` driver while Alembic migrations use the sync `PyMySQL` driver (`alembic/env.py` reads `DATABASE_URL_SYNC`).
- **Unix socket, not IP.** `?unix_socket=/cloudsql/…` connects through the Cloud SQL connector that Cloud Run mounts (`--add-cloudsql-instances`). It is encrypted and IAM-authorised, and it lets you remove the `0.0.0.0/0` rule from Cloud SQL later. The host part between `@` and `/` is left **empty** on purpose.

### How

**1. Get the instance connection name:**

```bash
gcloud sql instances describe clauseguard-db --format='value(connectionName)'
# -> clauseguard-512316:europe-west1:clauseguard-db
```

**2. URL-encode the DB password.** Characters like `@ : / ? # %` break the URL otherwise:

```bash
read -s DB_PW                                   # type the password, press Enter
DB_PW_ENC=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$DB_PW")
CONN=$(gcloud sql instances describe clauseguard-db --format='value(connectionName)')
```

Don't know the password? Reset it: `gcloud sql users set-password clauseguard_user --instance=clauseguard-db --host=% --prompt-for-password`. Then update your local `.env` too.

**3. Create the secrets.** Use `printf '%s'`, not `echo`, so no trailing newline ends up inside the secret:

```bash
printf '%s' "mysql+aiomysql://clauseguard_user:${DB_PW_ENC}@/clauseguard?unix_socket=/cloudsql/${CONN}" \
  | gcloud secrets create cg-database-url --data-file=- \
      --replication-policy=user-managed --locations=europe-west1

printf '%s' "mysql+pymysql://clauseguard_user:${DB_PW_ENC}@/clauseguard?unix_socket=/cloudsql/${CONN}" \
  | gcloud secrets create cg-database-url-sync --data-file=- \
      --replication-policy=user-managed --locations=europe-west1

read -s GEMINI_KEY                              # paste the Gemini key, press Enter
printf '%s' "$GEMINI_KEY" \
  | gcloud secrets create cg-gemini-api-key --data-file=- \
      --replication-policy=user-managed --locations=europe-west1

unset DB_PW DB_PW_ENC GEMINI_KEY               # clear them from the shell
```

`--locations=europe-west1` keeps the secret data in the EU.

**4. Check them** (prints the value, so do it privately):

```bash
gcloud secrets list
gcloud secrets versions access latest --secret=cg-database-url
```

**Changing a secret later:** add a new version, then redeploy so Cloud Run picks it up:

```bash
printf '%s' "<new value>" | gcloud secrets versions add cg-gemini-api-key --data-file=-
STEP=service ./setup_load_balancer.sh
```

**Who can read them:** `STEP=iam` grants `roles/secretmanager.secretAccessor` to the `clauseguard-api` service account. Nobody else needs access.

---

## 4. Run the script step by step

### What
`infra/gcp/setup_load_balancer.sh` holds nine named steps. `STEP=<name> ./setup_load_balancer.sh` runs one step. With no `STEP`, it runs all nine in order.

### Why step by step
- The first run will hit project-specific issues (an API still enabling, a missing permission, DNS not ready). One step at a time shows exactly where something failed.
- Most steps check whether a resource exists before creating it, so re-running a step is safe.
- Some steps need a manual action in between: secrets before `migrate`, file copy before cutover, DNS before the certificate becomes active.

### How

```bash
cd infra/gcp
# only if you created deploy.env for overrides:
# set -a; source deploy.env; set +a
```

### 4.1 `STEP=apis` — enable Google APIs
- **What:** turns on Cloud Run, Artifact Registry, Cloud Build, Compute (load balancer + Armor), Secret Manager, Cloud SQL Admin, Cloud Storage, Document AI and DLP.
- **Why:** each service refuses calls until its API is enabled in the project.
- **Run:** `STEP=apis ./setup_load_balancer.sh`
- **Check:** `gcloud services list --enabled | grep -E 'run|compute|secretmanager'`

**→ Now create the secrets (§3).**

### 4.2 `STEP=iam` — runtime service account
- **What:** creates `clauseguard-api@clauseguard-512316.iam.gserviceaccount.com` with `cloudsql.client`, `documentai.apiUser`, `dlp.user` and `secretmanager.secretAccessor` in `clauseguard-512316`, plus `firebaseauth.admin` and `serviceusage.serviceUsageConsumer` in the Firebase project `clauseguard-d6e96`.
- **Why:** this is the identity Cloud Run runs as. Google libraries pick it up automatically, so no JSON key files are needed in the container. It gets only the roles the app uses.
- **Run:** `STEP=iam ./setup_load_balancer.sh`
- **Check:** `gcloud projects get-iam-policy clauseguard-512316 --flatten=bindings --filter="bindings.members:clauseguard-api@" --format='value(bindings.role)'`

### 4.3 `STEP=bucket` — storage buckets
- **What:**
  - `clauseguard-leases-prod` (`europe-west1`) for redacted lease text.
  - `clauseguard-docs-in` / `clauseguard-docs-out` (EU) as Document AI staging, with a 1-day auto-delete rule.
  - Bucket-level access for the service account and for Document AI's own service agent.
- **Why:**
  - The lease bucket replaces AWS S3.
  - `extractor.py` uploads the **raw, unredacted** file to the staging bucket so Document AI can OCR it. The app deletes these files straight away; the 1-day rule cleans up anything left by a crash, which matters for GDPR.
  - All buckets block public access.
- **Run:** `STEP=bucket ./setup_load_balancer.sh`
- **Check:** `gcloud storage buckets list --format='table(name,location)'`

**→ Now copy the existing files from S3 (§5).**

### 4.4 `STEP=build` — build the container image
- **What:** creates the Artifact Registry repo `clauseguard` and runs Cloud Build on `Development/backend`. The image is tagged `europe-west1-docker.pkg.dev/<PROJECT_ID>/clauseguard/api:<timestamp>`, and the tag is saved to `infra/gcp/.last_image`.
- **Why:**
  - Building in Cloud Build means no local Docker is needed, and the image lands in the same region as Cloud Run.
  - `.gcloudignore` keeps `.venv`, tests and key files out of the upload.
  - `.dockerignore` keeps credentials out of the image.
- **Run:** `STEP=build ./setup_load_balancer.sh` (3–6 minutes)
- **Check:** `gcloud artifacts docker images list europe-west1-docker.pkg.dev/clauseguard-512316/clauseguard`

### 4.5 `STEP=migrate` — database migrations
- **What:** creates and runs the Cloud Run Job `clauseguard-migrate`, which runs `alembic upgrade head` using the new image.
- **Why:**
  - Migrations used to run inside the web container on every start. With several instances starting at once, they could race.
  - A one-off job runs exactly once per deploy.
  - It also applies **0006**, which rewrites stored `s3://` URIs to `gs://`. Run it **after** the file copy in §5.
- **Run:** `STEP=migrate ./setup_load_balancer.sh`
- **Check:** the command waits and prints `succeeded`. Logs: `gcloud run jobs executions list --job=clauseguard-migrate --region=europe-west1`

### 4.6 `STEP=service` — deploy the API on Cloud Run
- **What:** deploys `clauseguard-api` with:
  - Load-balancer-only ingress.
  - 2 vCPU / 2 GiB, concurrency 10, 0–5 instances, 300 s timeout.
  - The Cloud SQL socket attached.
  - Secrets and env vars, with `TRUSTED_PROXY_COUNT=1`.
  - `/health` startup and liveness probes.
- **Why:**
  - `--ingress=internal-and-cloud-load-balancing` blocks the public `run.app` URL, so nobody can bypass Cloud Armor.
  - `--allow-unauthenticated` is still needed: the load balancer forwards end users, and the app checks their Firebase tokens.
- **Run:** `STEP=service ./setup_load_balancer.sh`
- **Check:** `gcloud run services describe clauseguard-api --region=europe-west1 --format='value(status.conditions[0].status)'` → `True`. Opening the `run.app` URL in a browser should **fail**; that is correct.

### 4.7 `STEP=lb` — load balancer
- **What:**
  - Reserves a global static IP `cg-lb-ip`.
  - Creates a serverless NEG pointing at Cloud Run, the backend service (with request logging) and the URL map.
  - Creates a Google-managed certificate for `api.clauseguard.ie`.
  - Adds an HTTPS forwarding rule on 443 and an HTTP→HTTPS redirect on 80.
- **Why:**
  - One fixed IP for DNS, managed TLS and request logs.
  - The load balancer is also the attachment point for Cloud Armor.
  - No health check is configured, because serverless NEGs do not support one; Cloud Run's probes do that job.
- **Run:** `STEP=lb ./setup_load_balancer.sh`
- **Output:** the last lines print the DNS record to create, e.g. `api.clauseguard.ie -> 34.120.x.x`.

**→ Now update DNS (§6).**

### 4.8 `STEP=armor` — Cloud Armor
- **What:** policy `cg-armor`, attached to the backend service:
  - Rule 1000 throttles each IP to 300 requests/min and returns `429` above that.
  - Rules 2000/2001 are OWASP SQL-injection/XSS rules in **preview** (log only).
- **Why:**
  - The app's own rate limits live in each instance's memory, so with 5 instances a client could get 5× the limit. Cloud Armor enforces one global per-IP limit.
  - The OWASP rules start in log-only mode because lease text is legal prose that can look like SQL or HTML to the scanner.
- **Run:** `STEP=armor ./setup_load_balancer.sh`
- **After about a week:** check matches in Logs Explorer (`resource.type="http_load_balancer" jsonPayload.previewSecurityPolicy.outcome="DENY"`). If they are only attacks, enforce the rules:
  `gcloud compute security-policies rules update 2000 --security-policy=cg-armor --no-preview` (and the same for 2001).

### 4.9 `STEP=verify`
- **What:** requests `/health` on the `run.app` URL (should be blocked) and through `https://api.clauseguard.ie` (should return `200`), then prints the certificate status.
- **Run:** `STEP=verify ./setup_load_balancer.sh`
- **Expected:** `404` or `403`, then `200`, then `ACTIVE`. Before DNS and the certificate are ready, the second request fails; wait and re-run.

### Redeploying after code changes

```bash
STEP=build   ./setup_load_balancer.sh
STEP=migrate ./setup_load_balancer.sh   # only if there is a new Alembic migration
STEP=service ./setup_load_balancer.sh
```

The load balancer, Armor and DNS do not change between deploys.

---

## 5. Copy existing files from AWS S3 to GCS (one-off)

**What:** copy every object in the old S3 bucket to `gs://clauseguard-leases-prod`, keeping the same object keys.

**Why:**
- Each `documents` row stores an `s3_key` such as `documents/<user_id>/<uuid>.txt`. Chat and delete use that key.
- With the same keys in GCS, existing analyses keep working and no row needs changing apart from the URI rewrite in migration 0006.

**How** (Storage Transfer Service):

```bash
# 1. Read-only AWS credentials for the transfer (AWS IAM user with s3:ListBucket + s3:GetObject)
cat > aws.creds.json <<'EOF'
{"accessKeyId": "AKIA...", "secretAccessKey": "..."}
EOF
# (*.creds.json is git-ignored in infra/gcp)

# 2. Let the transfer service write to the bucket
gcloud transfer authorize --add-missing

# 3. Run the copy
gcloud transfer jobs create s3://<OLD_S3_BUCKET> gs://clauseguard-leases-prod \
  --source-creds-file=aws.creds.json --name=cg-s3-to-gcs

# 4. Watch it and compare counts
gcloud transfer operations list --job-names=cg-s3-to-gcs
gcloud storage ls -r gs://clauseguard-leases-prod/** | wc -l
aws s3 ls s3://<OLD_S3_BUCKET> --recursive | wc -l

rm aws.creds.json
```

At cutover, pause uploads, run the job once more (`gcloud transfer jobs run cg-s3-to-gcs`) to pick up new files, then run `STEP=migrate`.

---

## 6. Point the `api.clauseguard.ie` DNS record at the load balancer IP

### What
An **A record**: `api.clauseguard.ie → <cg-lb-ip>`, created at whoever hosts DNS for `clauseguard.ie` (your registrar or DNS provider).

### Why
- Browsers and the frontend reach the API by name. The A record sends that name to the load balancer.
- Google issues the managed TLS certificate **only after** it can see the domain resolving to the load balancer's IP. Until then, HTTPS on `api.clauseguard.ie` does not work. This is why DNS has to come after `STEP=lb`.
- The IP is a reserved static IP, so it never changes. You set this record once.

### How

**1. Get the IP:**

```bash
gcloud compute addresses describe cg-lb-ip --global --format='value(address)'
```

**2. Lower the TTL first (optional, 1–2 days before cutover).** If `api.clauseguard.ie` already exists (e.g. a CNAME to `clauseguard-api.onrender.com`), set its TTL to 300 s. A rollback then takes 5 minutes instead of hours.

**3. Create or replace the record** in your DNS provider's panel:

| Field | Value |
| :--- | :--- |
| Type | `A` |
| Host / Name | `api` (some panels want `api.clauseguard.ie`) |
| Value / Points to | the IP from step 1 |
| TTL | `300` |

- **Delete any existing `CNAME` for `api`.** A name cannot have both a CNAME and an A record.
- Do not add an `AAAA` (IPv6) record unless you also reserve an IPv6 address.
- If the domain has **CAA** records, add `0 issue "pki.goog"` so Google can issue the certificate.

**4. Check propagation:**

```bash
dig +short api.clauseguard.ie            # should print the LB IP
# or: nslookup api.clauseguard.ie 8.8.8.8
```

**5. Wait for the certificate:**

```bash
watch -n 60 "gcloud compute ssl-certificates describe cg-ssl-cert --global --format='value(managed.status,managed.domainStatus)'"
```

- `PROVISIONING` → `ACTIVE` usually takes 15–60 minutes after DNS resolves.
- `FAILED_NOT_VISIBLE` means DNS is wrong or not yet propagated. Fix the record; Google keeps retrying.
- `FAILED_CAA_FORBIDDEN` means a CAA record is blocking `pki.goog`.

**Using Cloud DNS instead (optional, ~$0.20/month per zone):** create a zone, add the A record there, then change the domain's nameservers at the `.ie` registrar to the four `ns-cloud-*.googledomains.com` servers it lists. Only do this if you want DNS managed in GCP too; it is not needed.

**Rollback:** change the A record back to the old target (or restore the old CNAME). With TTL 300, traffic moves within about 5 minutes.

---

## 7. Frontend on Firebase App Hosting

**What:** Firebase App Hosting builds and serves the Next.js 16 app from GitHub (it runs on Cloud Run with a CDN). It replaces Vercel.

**Why:** it is GCP-native, supports Next.js server rendering, gives free managed TLS for custom domains, and lives in the same Firebase project as Auth.

**How:**
1. Firebase Console → **App Hosting** → **Get started** → connect the GitHub repo → root directory `Development/frontend` → live branch `main` → region `europe-west4` (or the nearest offered EU region).
2. Add `Development/frontend/apphosting.yaml`:

   ```yaml
   runConfig:
     minInstances: 0
     maxInstances: 3
   env:
     - variable: NEXT_PUBLIC_API_URL
       value: https://api.clauseguard.ie/api
       availability: [BUILD, RUNTIME]
     - variable: NEXT_PUBLIC_FIREBASE_API_KEY
       value: <web api key>
       availability: [BUILD, RUNTIME]
     - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
       value: <project>.firebaseapp.com
       availability: [BUILD, RUNTIME]
     - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
       value: <project id>
       availability: [BUILD, RUNTIME]
     - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
       value: <project>.appspot.com
       availability: [BUILD, RUNTIME]
     - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
       value: <sender id>
       availability: [BUILD, RUNTIME]
     - variable: NEXT_PUBLIC_FIREBASE_APP_ID
       value: <app id>
       availability: [BUILD, RUNTIME]
   ```

   `NEXT_PUBLIC_*` values are public by design (they ship to the browser), so they can be committed.
3. App Hosting → **Settings → Domains** → add `clauseguard.ie` and `www.clauseguard.ie`. Create the DNS records it shows (these are separate from the `api` record) and remove the old Vercel records.
4. Firebase Console → **Authentication → Settings → Authorized domains** → add `clauseguard.ie` and `www.clauseguard.ie`.

---

## 8. Post-deployment checklist

- [ ] `curl https://api.clauseguard.ie/health` → `{"status":"ok"}`
- [ ] `curl -I http://api.clauseguard.ie/health` → `301` to HTTPS
- [ ] `run.app` URL is blocked
- [ ] `https://api.clauseguard.ie/docs` loads Swagger
- [ ] Frontend at `https://www.clauseguard.ie` shows no CORS errors in the browser console
- [ ] Register and log in through the frontend; the backend accepts the token
- [ ] Upload a scanned PDF lease → `201`; object appears under `gs://clauseguard-leases-prod/documents/<user>/`; staging buckets are empty afterwards
- [ ] Upload a non-lease file → `422`
- [ ] Clause Q&A answers (reads from GCS, calls Gemini)
- [ ] Notice checker works
- [ ] An **old** analysis (copied from S3) still opens and chats
- [ ] Delete an analysis → its GCS object is gone
- [ ] Delete a test account → all its objects are gone
- [ ] 301 quick requests from one IP → `429` from Cloud Armor
- [ ] Budget alerts set (Billing → Budgets: $50 and $100)
- [ ] Remove `0.0.0.0/0` from Cloud SQL → Connections → Authorized networks (Cloud Run uses the socket)

**Demo day:** the day before, run `MIN_INSTANCES=1 STEP=service ./setup_load_balancer.sh` to avoid cold starts. Afterwards set it back to `0`. A warm instance costs roughly $1/day.

---

## 9. Decommission old providers (after 14 stable days)

- [ ] **AWS:** empty and delete the S3 bucket; delete the app IAM user, the transfer IAM user and their access keys; check Billing for leftovers.
- [ ] **Render:** delete the `clauseguard-api` service, its env vars and secret file.
- [ ] **Vercel:** remove domains, then delete the project.
- [ ] **Code:** remove AWS lines from your local `Development/backend/.env`; retire the old `DEPLOYMENT_GUIDE.md`.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| `PERMISSION_DENIED` on `secrets create` | Secret Manager API not enabled yet | Run `STEP=apis` first |
| Cloud Build fails with `artifactregistry.repositories.uploadArtifacts denied` | Build service account cannot push | Grant `roles/artifactregistry.writer` (and `roles/logging.logWriter`) to the Cloud Build / default compute service account shown in the error |
| `unrecognized arguments: --startup-probe` | Old gcloud | `gcloud components update` |
| Migrate job: `Can't connect to MySQL server` | Wrong connection name or password encoding in the secret | `gcloud secrets versions access latest --secret=cg-database-url-sync`; check the `/cloudsql/<PROJECT>:<REGION>:<INSTANCE>` part and URL-encoding |
| Migrate job: `Access denied for user` | Wrong password, or user host not `%` | Reset with `gcloud sql users set-password … --host=%` and add a new secret version |
| `403` on upload, logs mention `storage.objects.create` | Service account lacks bucket access | Re-run `STEP=bucket` |
| Document AI error about the input or output URI | Document AI service agent lacks bucket access | Re-run `STEP=bucket` (it grants `service-<number>@gcp-sa-prod-dai-core`) |
| Every API call returns `401` | Cloud Run has the wrong `FIREBASE_PROJECT_ID` (must be `clauseguard-d6e96`) | `gcloud run services describe clauseguard-api --region=europe-west1 --format=yaml \| grep -A1 FIREBASE_PROJECT_ID`; fix and re-run `STEP=service` |
| `STEP=iam` fails on `clauseguard-d6e96` | Your account lacks IAM rights in the Firebase project | Ask its owner to grant `roles/firebaseauth.admin` to `clauseguard-api@clauseguard-512316.iam.gserviceaccount.com` in `clauseguard-d6e96` |
| Browser CORS error | Frontend origin missing from `ALLOWED_ORIGINS` | Update `deploy.env`, re-run `STEP=service` |
| Certificate stuck in `FAILED_NOT_VISIBLE` | DNS not pointing at the LB IP | Fix the A record (§6); remove the old CNAME |
| `429` for normal users | Cloud Armor threshold too low (or many users behind one NAT, e.g. a campus) | Raise `--rate-limit-threshold-count` on rule 1000 |
| Legitimate uploads blocked with `403` | OWASP rule enforced too early | Put rules 2000/2001 back in `--preview` |
