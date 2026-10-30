# FMB operations implementation plan

**Goal:** Add responsive Summary, Thali Members, Pauses, and Menus tabs to FMB, and today's live menu to Home.

**Architecture:** Retain the existing React Native/Expo screen and live authenticated API transport. Use separate panels for summary, menus, and pauses; extend the existing Thali panel. Normal users receive personal pause/resume and menu viewing; Aamil/FMB_User/FMB_Admin receive management tools. Backend scopes personal records and enforces authorization.

**Contract:** Uploaded Swagger e55dbac1; user confirmed menu POST accepts an array of 1–22 entries and subsequently corrected each entry's field names to `{menuDate, menuJson}`. PUT also uses `{menuDate, menuJson}`. Request-window endpoints are out of scope.

## Constraints and review focus
- Preserve all current accounts, authentication, user management, single/bulk Thali start behavior.
- Counts come from summary API, never a paginated member list.
- Personal pause creation omits muminId; managers select a member. Validate calendar dates, ordering, future pause/resume dates, reason length.
- Reject duplicate menu dates and >22 entries; date alone is valid. Preserve arbitrary JSON when editing. Show only the matching local day's menu on Home.
- Errors stay visible, dialogs cannot resubmit in flight, deletes require explicit review, logs load only when opened, stale requests cannot replace newer results.
- Support laptop tables/grids and phone cards/forms; no production data mutations during verification.

## Tasks
- [x] Add failing tests for FMB payload validation, daily menu matching, new live API paths and queries. Run and inspect failures.
- [x] Implement API methods and pure workflow helpers; run focused tests.
- [x] Add common responsive modal/menu/log components, summary panel with daily counts, family counts, movements, upcoming totals, trends, sectors, menu coverage and alerts.
- [x] Extend Thali members with stop, corrected dates (optional end date), and mistaken-entry deletion. Current list does not return dates and Swagger has no period detail GET; require corrected start date explicitly.
- [x] Implement paginated pause list, details/logs, personal/on-behalf create and resume.
- [x] Implement date-filtered menu list, detail/logs, 1–22 date creation, update/delete; add today's API menu to Home with exact date matching.
- [x] Wire tabs, run all tests and development export. Inspect laptop/mobile views and read-only live requests; review changes for authorization, pagination, dates, partial failures, and regression risks.

## Verification outcome
- 42 node tests pass; development web export succeeds; whitespace checks pass.
- Read-only development UI checked at 1440×1000, 768×1024 and 390×844. Summary returned 4 registered, 0 paused and 4 expected for 2026-10-29. Menus and pauses currently have no entries; mutations were validated through API/payload and handler tests without writing live records.
- Independent review found partial-save retry, canceled-detail loading, and refreshed-role state retention issues. All three were reproduced with failing handler tests and fixed; the full suite passes.
- Backend summary warns request windows are unset. Request-window administration remains deferred by user instruction; backend scheduling restrictions still apply.

## Follow-up: request windows and permissions
- Request-window GET, PUT and log integration is now implemented for Aamil/FMB_Admin; the four HH:mm fields and latest actor/time history are displayed. The specific backend response for unconfigured windows permits initial setup.
- FMB_User retains creation/viewing; stop, edit and delete require Aamil/FMB_Admin. Role changes reset panel state, including admin-only dialogs. Normal personal pause/resume remains available subject to request times.
- Pause and resume submission fetches fresh server window flags before any POST. Closed, missing or unavailable checks block the POST; device clock/timezone does not determine permission.
- Phone dashboard FMB and Namaaz cards now use full available width. Verified 366px widths aligned with announcement cards at a 390px viewport; desktop side cards remain 350px wide.
- 55 tests pass; development export succeeds; desktop and phone settings verified without saving live settings or modifying Thali records.
