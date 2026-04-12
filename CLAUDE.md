# Ultra minimalistic knee-prehab tracker

## Project constraints

- **GitOps** — all data lives in `data.json`, committed to the repo. No backend, no database.
- **Mobile-first** — UI must be fully usable on a phone (touch targets, viewport, no hover-only interactions).

## Architecture

The app is a single-page static site. The data contract lives entirely in `data.json`:

- `program` — athlete metadata and session parameters
- `baseline_tests` — periodic assessment tests (with `bilateral` flag for left/right tracking)
- `blocks[]` → `exercises[]` — ordered workout structure the UI renders
- `evidence` — reference citations keyed from exercises (display-only)

When the HTML/JS is built, it should read `data.json` at load time (fetch or inline) to render the workout and tests. Logged session results should be appended back to `data.json` (e.g. a `sessions[]` array) and committed via git — that is the persistence mechanism.

## Session logging

The UI must allow the user to record, per session:
- Weights used for each exercise
- Reps/sets actually completed
- Baseline test measurements (when a test session is performed)

Logged data is staged in `localStorage` so it survives a page reload. After logging, the app exports an updated `data.json` (or a patch) that the user downloads and commits, keeping the GitOps contract intact. No server-side write path is required.

## Development

Open `index.html` directly in a browser — no server required unless `fetch()` is used for `data.json` (in which case run any static file server, e.g. `python3 -m http.server`).

There are no tests, linters, or build commands.
