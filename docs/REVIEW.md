# Final submission-readiness review

Reviewed on **2026-11-05** against both pages of
`Mini_DPP_Teknik_Odev_ESG_Next.pdf` and the supplied CSV. The expanded implementation
brief is in [IMPLEMENTATION.md](IMPLEMENTATION.md).

**Result:** no outstanding mandatory-feature or bonus defect was found in the
reviewed workflows. The safe fixes below address documentation accuracy and a
reproduced Windows checkout problem. Application source, API contracts, immutable
history behavior and the Model/Batch/Revision database architecture are unchanged.

## Prioritized findings

| Priority | Finding and evidence | Disposition |
| --- | --- | --- |
| P2 | Fresh Windows clone with system `core.autocrlf=true` changes source files to CRLF: `dotnet format` exits 1 with ENDOFLINE errors, and Prettier exits 1 for 20 files. It also changes the sample CSV SHA-256 to `3A3444007F0F32D04D4C25BF4CDF63E298AC21EB27F971F1A2D350DFBC04E1C9`. | Fixed with `.gitattributes`: LF source checkouts, no text conversion for the supplied CSV, binary PDF handling. Recreated clone files now pass both formatters and match the original CSV hash. No source or input file needed editing. |
| P2 | README, REVIEW, IMPLEMENTATION and COMMITS incorrectly described an uncommitted implementation and unexecuted remote CI. Public `main`, a fresh public clone and GitHub run/job APIs contradict those statements. | Fixed all four documents; recorded actual commit subjects, SHA, CI URL and job outcomes. Replaced the obsolete commit construction plan with observed history. |
| Owner decision | The assessment PDF is publicly tracked in `07c69fd`. Page 2 expressly allows including the sample CSV; it does not explicitly address public redistribution of the assessment PDF. | Recommendation: keep a private reference copy and obtain ESG Next's agreement before retaining the PDF publicly. This is a publication-permission decision, not an established application defect or legal restriction. The PDF and history remain untouched. |

No P0/P1 application finding was established. No speculative features, framework
changes or refactoring are proposed.

## Published Git and CI evidence

At review start, local HEAD, the fresh public clone and the GitHub `main` branch API all reported
`b5f86b8a022c3f88b189acac3abfd3fa1d8dd966`. The initial commit is followed by nine
incremental tooling, domain, persistence, API, test, frontend, documentation and CI
commits. Their actual subjects are in [COMMITS.md](COMMITS.md).

[Build and test run #1](https://github.com/GorkemErtas/mini-dpp-platform/actions/runs/41825678774)
was triggered by a push to `main` on **2026-11-04** at that SHA. Its first attempt
completed successfully; the **backend**, **frontend** and **browser** jobs and their
required steps all passed. The run started at 15:01:19 and was complete by 15:02:32
Türkiye time (12:01:19–12:02:32 UTC).

That remote result applies to the reviewed base SHA. This review's documentation
and `.gitattributes` fixes were verified locally. The owner subsequently authorized
committing and pushing them; check the corresponding later run on the
[Actions page](https://github.com/GorkemErtas/mini-dpp-platform/actions).

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
| Reviewer setup/docs | Complete: fresh-clone setup, migrations, examples, assumptions, unchanged inputs and verified commit history |
| Builds, tests, lint/typecheck and CI | Passed locally and in the verified published GitHub Actions run; checkout fix verified locally |
| Review and delivery constraints | Review initially left fixes unstaged; the owner subsequently authorized commit/push. No reset, rebase, amend, deployment, PDF removal or history rewrite is included. |

## Executed verification

Reverified on Windows on **2026-11-05** with workspace **.NET SDK 10.0.403 / runtime 10.0.14**, Node
**26.13.0**, and npm **11.20.0**. CI targets .NET 10 and Node 24 on Ubuntu.

A real clone of `https://github.com/GorkemErtas/mini-dpp-platform.git` was created
under ignored `.tools/submission-review`, without copied dependencies, build output
or databases. The workspace SDK helper supplied the already installed .NET 10 SDK;
the clone restored its own locked dependencies. The documented development launch
profile created and migrated a new SQLite database in the clone's API directory.
The current workspace's demo database was not used.

After reproducing the Windows failure, `.gitattributes` was copied into the isolated
clone and its tracked text files were recreated from its existing index with
`core.autocrlf=true`. Git reported LF working files, and both formatting checks
passed. This tested the proposed checkout behavior before creating a delivery
commit; the reviewed base SHA contains the pre-fix state.

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
- A changed single-row import returned **1 updated** and produced versions **[2, 1]**.
  Carbon changed from **12.4** to **14.25**; version 1, including its timestamp,
  remained identical. Reimporting **14.250** returned **1 unchanged**, with two
  snapshots still present. Real Chromium checks displayed both timeline entries.
- After server shutdown, read-only SQLite inspection confirmed **3 models,
  3 batches and 4 revisions**, GTIN storage type **text**, the applied migration,
  `PRAGMA integrity_check = ok` and no `foreign_key_check` violations.
- Consumer and `rol=yetkili` HTTP checks passed for list, detail, history, single
  snapshot, HTML and JSON-LD; carbon was omitted or present consistently. Read
  responses returned `Cache-Control: no-store`.
- QR tests decoded the exact configured consumer URL despite spoofed Host/role.
  Direct checks confirmed PNG bytes and the default `http://localhost:5173/dpp/{gtin}`
  public URL. Chromium loaded the HTML page's QR image successfully.
- Swagger JSON exposed multipart upload and history schemas. The actual Swagger
  UI rendered through the Vite proxy; updated React detail, role switches and
  output links passed with no browser console or page errors.
- Desktop and mobile screenshots were inspected. The supplied CSV bytes were not
  edited; its SHA-256 after the checkout fix is
  `A3C4189EA0EDB327A0E2EB67B6FEEBE0DF0370A96162B476C91285B458E7A107`.
  The PDF remains unchanged at
  `0CEEF3AC96F49AA7A1A5E23FBFFD78B0E571AEBC98AD288A3D36F440C6FCAC81`.

Final command results (all executed successfully in the clone; initial checkout
failures and their fix are recorded above):

| Check | Result |
| --- | --- |
| `dotnet restore backend/MiniDpp.sln --locked-mode` | Passed with checked-in dependency locks |
| `dotnet build backend/MiniDpp.sln --no-restore --configuration Release` | Passed, zero warnings/errors |
| `dotnet test backend/MiniDpp.sln --no-build --configuration Release` | 62 passed, zero failures/skips |
| `dotnet format backend/MiniDpp.sln --no-restore --verify-no-changes` | Passed after checkout fix; initially failed on CRLF |
| `dotnet tool restore` | Restored checked-in EF tool 10.0.14 |
| `dotnet ef migrations has-pending-model-changes --project backend/src/MiniDpp.Infrastructure --startup-project backend/src/MiniDpp.Api --configuration Release --no-build` | No pending changes |
| `dotnet list backend/MiniDpp.sln package --vulnerable --include-transitive` | No known vulnerable packages in any project |
| `npm ci` | Clean dependency installation, zero reported vulnerabilities |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | All passed; format initially failed on CRLF, then passed after checkout fix |
| `npm test` | 11 passed |
| `npm run build` | Passed; Vite production assets generated |
| `npx playwright install chromium` / `npm run test:e2e` | Passed with `CI=true`, automatic server startup and a fresh isolated database; 1 workflow, zero tested axe violations |
| Direct HTTP + Chromium smoke script (temporary review tooling) | Passed against a second empty clone database: exact sample/repeat reports, changed/equivalent imports, immutable v1, visibility, QR image, updated timeline and rendered Swagger UI |

Frontend commands run from `frontend/`; backend commands run from the root.
Restricted execution initially blocked Git child processes and a .NET restore;
those operations and subsequent executable checks used the approved execution
permissions. No verification command remains blocked. Temporary review scripts,
clone, logs, screenshots and databases live under ignored `.tools/`. All
review-started development servers were stopped after verification.

## Repository contents

The repository initially contained only a one-line README. It now contains:

- **Backend:** solution and five projects, domain entities/validation, application
  contracts/presenter, importer/reader/EF context, generated migration and snapshot,
  API/output/error handling and configuration, dependency lock files, and xUnit tests.
- **Frontend:** package/lock and tooling configuration; typed API client, route shell,
  product/import/detail pages, reusable UI, responsive CSS, favicon, unit/workflow
  tests, and browser/accessibility tests with Playwright configuration.
- **Review/DX:** expanded README, source PDF, original sample CSV, implementation
  checklist, this verification record, actual commit history, workspace SDK helper,
  GitHub Actions workflow, SDK/tool manifests, editor and checkout configuration,
  and ignore rules.

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

No outstanding mandatory or bonus defect was found in the checks above. Real
authorization, cloud deployment and Docker are outside the assessment. The app uses
local development serving and a small unpaginated catalogue; see README for
malformed-quote, concurrency and production-hosting trade-offs.

After reviewing these findings, the owner authorized committing and pushing the
fixes. A subsequent GitHub Actions run establishes remote CI evidence for that
delivery commit; the run linked above remains evidence for the reviewed base SHA.

The PDF decision remains open. Removing a file in a later commit would leave it in
the existing public history. This review makes no removal or history rewrite; any
such action requires the owner's explicit approval. The source PDF's permission
question does not alter the verified application feature results.
