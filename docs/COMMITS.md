# Verified incremental commit history

Verified on **2026-11-05** using local Git history, a fresh clone of the public
repository and the GitHub branch/run APIs. At review start, public `main` and local
HEAD both pointed to `b5f86b8a022c3f88b189acac3abfd3fa1d8dd966`.

The initial commit and nine subsequent incremental commits are already published.
This is the observed history, in chronological order:

| Commit | Actual subject |
| --- | --- |
| `9bb56db` | Initial commit |
| `e12197a` | chore(repo): configure SDK tooling and repository conventions |
| `37f8f58` | feat(domain): add product models validation and passport contracts |
| `9700feb` | feat(persistence): add atomic CSV imports and versioned SQLite storage |
| `ee83599` | feat(api): expose product passports QR codes and demo visibility |
| `6c72415` | test(backend): cover validation imports passports and version history |
| `485a69a` | feat(frontend): add product dashboard import and passport views |
| `34d1c01` | test(frontend): cover UI workflows and browser accessibility |
| `07c69fd` | docs: document setup architecture and assessment acceptance |
| `b5f86b8` | ci: add backend frontend and browser checks |

Browse the [public commit history](https://github.com/GorkemErtas/mini-dpp-platform/commits/main/).
The previous proposal to construct an incremental history is obsolete.

## Verified CI evidence

[Build and test run #1](https://github.com/GorkemErtas/mini-dpp-platform/actions/runs/41825678774)
was triggered by a push to `main` at the reviewed SHA on **2026-11-04**. It started
at **12:01:19 UTC (15:01:19 Türkiye time)** and completed successfully by
**12:02:32 UTC (15:02:32 Türkiye time)**, on attempt 1.

| Job | Verified result |
| --- | --- |
| backend | Success: locked restore, Release build, formatting and xUnit tests |
| frontend | Success: npm ci, typecheck, lint, formatting, Vitest and production build |
| browser | Success: dependency setup, Chromium install and Playwright workflow |

This remote run covers the reviewed base SHA. Local results for the submission
review fixes are in [REVIEW.md](REVIEW.md). Runs for subsequent commits are on the
[Actions page](https://github.com/GorkemErtas/mini-dpp-platform/actions).

## Current review changes

The submission review corrects documentation and adds Git checkout attributes for
reproducible Windows formatting and unchanged input bytes. Application source,
database schema, API contracts, the PDF and existing Git history are unchanged.
The review initially left its changes unstaged and uncommitted. The owner then
explicitly authorized committing and pushing these fixes. The table above records
the reviewed base history; the delivery commit appears in the public Git history.

Read-only inspection commands, from the repository root:

```sh
git status --short
git log --oneline --reverse
git diff --stat
git diff --check
git diff
```
