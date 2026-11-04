# Acceptance and verification

The PDF and supplied CSV were read completely before implementation. The expanded
brief is recorded in `IMPLEMENTATION.md`; the original PDF is alongside this file.

## Requirements compliance

| Requirement | Status / implementation evidence |
| --- | --- |
| CSV upload, UTF-8/BOM, per-row validation, physical line errors | Complete: `CsvImporter`, `UploadEndpoint`; real sample, quoted/multiline, blank-line, malformed-record and encoding integration tests |
| GS1/GTIN string, required text, exact decimal rules | Complete: framework-free `ProductValidation`; boundary/negative unit tests |
| Partial success, per-row atomicity, repeat imports | Complete: separate EF transaction per valid row; injected revision failure proves rollback of batch/model and continuation |
| Related Model and Batch, constraints, migrations | Complete: `DppDbContext`, initial migration, unique model/batch and GTIN indexes; real SQLite integration tests |
| HTML `/dpp/{gtin}` | Complete: encoded, responsive semantic HTML; unknown GTIN 404 |
| schema.org Product JSON-LD | Complete: `PassportOutputs.JsonLd`, correct MIME and PropertyValue fields; consistency tests |
| Decodable QR PNG | Complete: QRCoder PNG; ZXing decodes exact configured URL; spoofed Host test |
| Consumer/authorized demo carbon filtering | Complete: shared `PassportPresenter`; regression tests for HTML, JSON-LD, list, product, history and single version, both roles |
| Immutable version history bonus | Complete: full snapshots from v1, UTC times, monotonic versions, no-op suppression, model reassignment and history endpoints/timeline |
| React + TypeScript bonus | Complete: dashboard search/location filter, upload/retry/errors, detail/role/QR/output links/timeline; real API integration |
| Accessible responsive UI and states | Complete: labels, focus, skip link, semantic markup, loading/empty/error states, reduced-motion CSS; axe desktop/mobile checks |
| Security and error handling | Complete for assessment scope: bounded uploads, safe errors, no carbon values in validation messages, escaping, fixed public URLs, configured CORS/hosts, DTOs, cancellation |
| Reviewer setup/docs | Complete: README quick start, migrations, examples, assumptions, original inputs, commit guidance |
| Builds, tests, lint/typecheck and CI | Complete locally; workflow configured, remote GitHub execution awaits an authorized push |
| No commit/push/deployment without approval | Honored; all application changes remain in the working tree |

## Executed verification

Verified on Windows with workspace **.NET SDK 10.0.403 / runtime 10.0.14**, Node
**26.13.0**, and npm **11.20.0**. CI targets .NET 10 and Node 24 on Ubuntu.

- Backend: **62 passing xUnit cases**, using real migrated SQLite databases.
- Frontend: **11 passing Vitest cases** across workflow/API tests.
- Chromium: **1 passing end-to-end workflow**, including CSV import, the exact two
  rejected rows, dashboard, role changes, history, HTML/JSON-LD/PNG HTTP responses,
  and a mobile overflow check.
- axe: **zero WCAG A/AA violations** on the tested import, dashboard, desktop detail
  and mobile detail states. Automated scans complement, rather than replace, manual
  accessibility evaluation.
- Actual local sample API import: total **5**, imported **3**, failed **2**, updated
  **0**, unchanged **0**. Reimports: unchanged **3**, failed **2**.
- Original/sample SHA-256 hashes match. Original CSV bytes are unchanged.

Final command results (all executed, exit code 0):

| Check | Result |
| --- | --- |
| `dotnet restore backend/MiniDpp.sln --locked-mode` | Passed with checked-in dependency locks |
| `dotnet build backend/MiniDpp.sln --no-restore --configuration Release` | Passed, zero warnings/errors |
| `dotnet test backend/MiniDpp.sln --no-build --configuration Release` | 62 passed, zero failures/skips |
| `dotnet format backend/MiniDpp.sln --no-restore --verify-no-changes` | Passed |
| `dotnet ef migrations has-pending-model-changes --project backend/src/MiniDpp.Infrastructure --startup-project backend/src/MiniDpp.Api --no-build` | No pending changes |
| `dotnet list backend/MiniDpp.sln package --vulnerable --include-transitive` | No known vulnerable packages in any project |
| `npm ci` | Clean dependency installation, zero reported vulnerabilities |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | All passed |
| `npm test` | 11 passed |
| `npm run build` | Passed; Vite production assets generated |
| `npm run test:e2e` | Passed against existing servers, then passed again with `CI=true`, automatic server startup and a fresh isolated database |

Frontend commands run from `frontend/`; backend commands run from the root.
Sandbox execution initially blocked compiler and esbuild child processes and package
network access; checks were rerun with the appropriate execution permissions,
rather than reported as passing in the sandbox. No verification command remains
blocked. All agent-started development servers were stopped after verification.

## Files changed

The repository initially contained only a one-line README. It now contains:

- **Backend:** solution and five projects, domain entities/validation, application
  contracts/presenter, importer/reader/EF context, generated migration and snapshot,
  API/output/error handling and configuration, dependency lock files, and xUnit tests.
- **Frontend:** package/lock and tooling configuration; typed API client, route shell,
  product/import/detail pages, reusable UI, responsive CSS, favicon, unit/workflow
  tests, and browser/accessibility tests with Playwright configuration.
- **Review/DX:** expanded README, source PDF, original sample CSV, implementation
  checklist, this verification record, commit plan, workspace SDK helper, GitHub
  Actions workflow, SDK/tool manifests, editor configuration and ignore rules.

Ignored build output, test diagnostics, local databases and workspace-only tools
are intentionally excluded from version control.

## Review entry points

1. `ProductValidation.cs`: explain GS1 weights and decimal validation.
2. `CsvImporter.cs`: parse the file, validate independently, transact each valid row.
3. `DppDbContext.cs` and migration: explain batch ownership and uniqueness.
4. `PassportPresenter` and `PassportOutputs.cs`: trace carbon filtering into all outputs.
5. `WorkflowTests.cs`: inspect the snapshot-failure rollback and visibility tests.
6. `DetailPage.tsx`: role switches discard old data, retain control focus and refetch.

## Known limitations and remaining work

No mandatory or bonus application feature remains. No commit/push, cloud deployment,
JWT, real authorization or Docker setup was attempted. GitHub Actions has not run
remotely. The app intentionally uses local development serving and a small unpaginated
catalogue; see README for malformed-quote, concurrency and production-hosting trade-offs.

Suggested commits are in `COMMITS.md`; they are proposals, not fabricated history.
