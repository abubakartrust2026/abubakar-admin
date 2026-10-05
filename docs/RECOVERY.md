# Backup, logging and recovery runbook

## What protects the data

| Layer | What it covers | Where |
|---|---|---|
| Nightly backup | Full copy of every collection, kept 30 days | GitHub Actions → Artifacts (`.github/workflows/backup.yml`) |
| Manual backup | Same, on demand | `cd backend && npm run backup` → `backend/backups/<timestamp>/` |
| Soft delete | Payments, invoices, students, ledger transactions, attendance, fees, users, inventory, institutions are hidden, not erased | `isDeleted` flag; restore via API |
| Audit log | Who created/changed/deleted/restored what, with old and new values | `auditlogs` collection, `GET /api/audit-logs` |
| Request/error logs | Every request and error as JSON with a request id | stdout (see host's log viewer) |

Target recovery point: at most 24 hours of data loss for a full-database disaster (nightly backup). A single mistaken delete loses nothing (soft delete). Atlas M10+ continuous backup, if enabled, tightens the 24 h figure.

One-time setup: add the repo secret `MONGODB_URI` (GitHub → Settings → Secrets → Actions). Run the workflow once via "Run workflow" and confirm an artifact appears. Backups contain personal and financial data, so keep the repository private.

## Scenario 1 — someone deleted a record by mistake
1. `GET /api/audit-logs/trash/payments` (or `invoices`, `students`, `ledger-transactions`, `attendance`, `fees`, `users`, `inventory`, `institutions`) as admin.
2. `POST /api/audit-logs/trash/payments/<id>/restore`.
A payment can only be restored if its invoice exists, an invoice or attendance record only if its student exists, and a ledger transaction only if its institution exists. Restore the parent first. A deleted user cannot log in until restored, and keeps their original password.

## Scenario 2 — "what happened to this record?"
`GET /api/audit-logs?entity=Payment&entityId=<id>` shows each change (`before` / `after` hold only the changed fields), the actor, IP and request id. Use the request id to find the matching log lines in the host's logs.

## Scenario 3 — the database is corrupted or lost
1. Download the latest `db-backup-*` artifact from GitHub Actions → unzip.
2. **Rehearse first** into a scratch database (e.g. a new free Atlas cluster):
   ```
   cd backend
   npm run restore -- <unzipped-folder>/<timestamp> --uri "<scratch mongodb uri>" --drop
   ```
   The script prints per-collection counts and flags `MISMATCH`.
3. Real restore into production only after confirming the scratch copy looks right:
   add `--allow-production` and point `--uri` at the production URI. Stop the backend first so nothing writes during the restore.
4. Run `POST /api/invoices/sync-counter` (admin) so invoice numbering continues correctly.

The restore script refuses to write to the database in `MONGODB_URI` unless `--allow-production` is given.

## Logs
- Local dev: readable `morgan` lines plus JSON from pino.
- Production: JSON lines on stdout; 5xx errors include the stack, 4xx are warnings. Passwords and `Authorization` headers are redacted. Set `LOG_LEVEL` (`debug`, `info`, `warn`) to adjust.
- Each response carries an `X-Request-Id` header; give that id when reporting a problem.

## Known limits
- Opening balances are audited (they cannot be deleted through the app). Bulk attendance is one audit entry per submission, listing only the students whose status changed.
- A soft-deleted user or institution still holds its unique email/name, so it cannot be re-created until the old one is restored.
- Seeder scripts and the Excel import write directly and are not audited.
- The nightly artifact is a logical export, not point-in-time. For finer recovery, upgrade Atlas to M10+ and enable Cloud Backup.
- GitHub scheduled workflows are paused after 60 days of repository inactivity; a push or a manual run re-enables them.
