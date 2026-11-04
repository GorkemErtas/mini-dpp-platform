# Implementation and acceptance plan

Sources read in full: `Mini_DPP_Teknik_Odev_ESG_Next.pdf` (two pages) and
`urunler_duzeltilmis_test.csv` (five data records). The supplied CSV is copied
byte-for-byte into samples; it must never be edited or resaved through Excel.

## A. Requirements checklist

- [x] Mandatory: CSV upload; independently validate rows; report physical CSV line numbers.
- [x] Mandatory: preserve 14-character GTIN text and validate GS1 check digit.
- [x] Mandatory: decimal fiber percentages in [0,100], total 100; nonnegative carbon;
  nonblank model, batch and manufacturing location.
- [x] Mandatory: relational Model -> Batch persistence in SQLite.
- [x] Mandatory: human-readable `/dpp/{gtin}` and schema.org Product JSON-LD.
- [x] Mandatory: real PNG QR linking to the HTML passport.
- [x] Mandatory: carbon hidden by default and visible with `?rol=yetkili` in both outputs.
- [x] Mandatory: reproducible setup, sample workflow and design decisions in README.
- [x] Bonus (in scope): React + TypeScript interface.
- [x] Bonus (in scope): full immutable product version history.
- [x] Expanded brief: migrations, DTOs, bounded upload, CORS, consistent errors,
  automated backend/frontend tests, OpenAPI, CI, no commits or deployment.

## B. Schema and update rules

- **ProductModel**: integer PK, unique case-sensitive trimmed name. Model names are
  shared identities; no mutable composition or manufacturing data is stored here.
- **Batch**: integer PK, required model FK, unique GTIN text, batch number, cotton,
  elastane, manufacturing location, carbon, version and UTC update timestamp.
  `(ModelId, Number)` is unique: a model/batch identity cannot acquire another GTIN.
- **ProductRevision**: integer PK, batch FK, unique `(BatchId, Version)`, immutable
  full state including model name and UTC timestamp. Version 1 is stored on creation;
  changed imports append version N+1 in the same transaction as the current state.
- Fibers and manufacturing data belong to a batch: lots can have different recipes
  and emissions. Changing the model name reassigns only this GTIN to the named model;
  another batch is never rewritten. Models may remain after reassignment.
- Identical normalized values are a no-op. Each row has its own transaction. Conflicts
  reject that row, with no model or revision left behind. Duplicate GTINs within a file
  are processed in order, using the same rules as subsequent imports.
- SQLite stores decimals as invariant text to preserve decimal precision; validation
  uses .NET decimal arithmetic, never floating point equality.
- A shared presenter omits carbon entirely from consumer DTOs, HTML, JSON-LD and history.

## C. Contracts and interface

| Method | Route | Contract |
| --- | --- | --- |
| POST | /api/import/csv | multipart `file`; total/imported/updated/unchanged/failed/errors |
| GET | /api/products?q= | array of role-filtered passport DTOs; optional search |
| GET | /api/products/{gtin} | passport DTO or 404 |
| GET | /api/products/{gtin}/history | descending snapshot DTOs or 404 |
| GET | /api/products/{gtin}/history/{version} | snapshot DTO or 404 |
| GET | /dpp/{gtin} | accessible HTML or 404 |
| GET | /dpp/{gtin}.jsonld | application/ld+json or 404 |
| GET | /dpp/{gtin}/qr.png | PNG containing configured absolute consumer HTML URL |

Read routes support `?rol=yetkili` except QR (always consumer URL). Role responses
are not cached. This parameter is a demo visibility switch, never authorization.
Import/file failures use Problem Details, while independently rejected rows return
a successful import report containing safe field errors and physical start lines.

Pages: searchable product dashboard, dedicated upload view with retry and row errors,
detail with composition, QR preview/download, output links, role switch and timeline.
All pages have loading/error/empty states and responsive keyboard-accessible controls.

## D. Structure

```text
backend/src/MiniDpp.{Domain,Application,Infrastructure,Api}/
backend/tests/MiniDpp.Tests/
frontend/{src,tests}/
samples/
docs/
.github/workflows/
```

## E. Milestones and checkpoints

1. Initialize projects; verify dependency restoration and LTS SDK.
2. Implement domain validation, database schema/migration, atomic CSV import.
   Check exact sample outcome and repeat/change/conflict behavior.
3. Add shared filtered DTOs, HTML, JSON-LD, QR, history and OpenAPI.
   Check visibility leaks, consistency, 404s and decoded QR destination.
4. Implement typed React UI; check upload/errors/role toggle and responsive styling.
5. Run backend tests/build/format and frontend tests/typecheck/lint/build.
6. Finish README, CI, requirement mapping and suggested incremental commit commands.

No commit, push, publish, authentication or cloud setup is authorized.
