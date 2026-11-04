# Suggested real incremental commits

No commits or pushes have been made. The working tree contains the complete
implementation for review. These commands are suggestions to run yourself after
review/approval. Never backdate commits or create empty commits to simulate progress.

Some features share files, so use `git add -p` for the stated logical hunks. After each
commit, run the relevant checks. The detailed dependency/build checks are in README.
Where a hunk cannot form a meaningful buildable commit, combine adjacent milestones.

| Order | Logical change ready | Suggested commit |
| --- | --- | --- |
| 1 | Solution/project configuration, ignore/editor files, tool manifest | `chore: initialize mini dpp solution` |
| 2 | Domain entities, DbContext, initial migration and dependency locks | `feat: model relational persistence with ef core` |
| 3 | Domain validation, CSV service, import contracts and upload endpoint | `feat: implement validated csv import` |
| 4 | Product reader, passport routes, HTML, schema.org JSON-LD and QR | `feat: expose html jsonld and qr passports` |
| 5 | Shared visibility presenter, carbon omission and response cache rules | `feat: implement demo role visibility` |
| 6 | Revision snapshots, transactional change/no-op semantics, history routes | `feat: add product version history` |
| 7 | Typed React client, dashboard, import, detail, history and responsive CSS | `feat: build react typescript interface` |
| 8 | Backend tests, frontend tests, real-browser/accessibility checks | `test: cover import validation and dpp workflows` |
| 9 | README, source PDF/CSV, acceptance record and optional SDK helper | `docs: complete setup and api documentation` |
| 10 | GitHub Actions builds, formatting, tests and browser workflow | `ci: add build and test workflow` |

Example commands for the first logical boundary:

```sh
git diff --no-index /dev/null global.json
git add .gitignore .editorconfig global.json .config/dotnet-tools.json backend/Directory.Build.props backend/MiniDpp.sln
git add backend/src/*/*.csproj backend/tests/*/*.csproj backend/**/packages.lock.json
git diff --cached
git commit -m "chore: initialize mini dpp solution"
```

New files are untracked, so `git add -p` alone will not offer their hunks. For files
you want to split, first mark only those paths with intent-to-add, then review hunks:

```sh
git add -N backend/src/MiniDpp.Api/Program.cs
git add -p backend/src/MiniDpp.Api/Program.cs
git diff --cached
```

On Windows PowerShell, review a new file with `Get-Content` rather than the Unix
`/dev/null` example above. Prefer your editor's staged-diff view for file splitting.
The initial project files reference later source files by convention; stages 1–6 may
reasonably be combined into a coherent backend commit instead of manufacturing
incomplete intermediate states. This plan is a set of honest logical boundaries,
not a claim that those historical steps already occurred.
