# Persistence, Import, Export, and Privacy

## Canonical architecture document

An architecture JSON document contains `version`, `appVersion`, `engineVersion`, nodes, edges, zones, traffic configuration, and non-sensitive simulation metadata. It does not contain active requests, traces, metrics history, undo history, toasts, modal state, or secrets. Unknown root and nested fields are rejected.

The import boundary applies byte, depth, collection, identifier, coordinate, numeric, and string limits before migration. Supported historical versions are migrated without mutating caller-owned input. Migration tests cover every supported version and the strict validator runs again after migration.

## Storage surfaces

| Surface           | Contents                                                                          | Lifetime                               | Privacy implication                               |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| JSON export       | Canonical architecture and traffic assumptions                                    | User-managed file                      | May reveal internal names and topology            |
| PNG export        | Visible canvas                                                                    | User-managed file                      | May reveal labels and layout                      |
| Share URL hash    | Compressed canonical architecture                                                 | Browser history/clipboard              | Avoid pasting into public tickets or chats        |
| Workspace draft   | Canonical architecture and traffic; unreadable draft backup when possible         | Browser localStorage                   | Saved automatically on this browser profile       |
| Run history       | Up to ten summaries and their starting architectures, including a pinned baseline | Current tab session; cleared on reload | Contains architecture names and workload settings |
| Snapshot slots    | Canonical architecture and traffic assumptions                                    | Browser localStorage                   | Remains on that browser profile until cleared     |
| Scenario progress | Completion and notes                                                              | Browser localStorage                   | Notes may contain user-entered information        |
| Diagnostic export | Version, browser, graph counts, seed, runtime/performance state                   | User-managed file                      | Intentionally excludes topology and content       |

The application is static and has no application backend. A URL fragment is not part of the HTTP request, but browser extensions, client-side analytics, screenshots, clipboard history, and recipients can still observe it.

## Migration policy

1. Add a migration before changing the current schema version.
2. Preserve all supported fields and supply documented defaults for new fields.
3. Add a fixture for every historical version and a maximum-size round trip.
4. Reject future versions with a clear message rather than guessing.
5. Keep engine-version metadata separate from the persistence schema version.

Snapshots restore architecture and traffic configuration, then reset simulation runtime state. They never resume an in-flight worker execution.

## Automatic workspace recovery

Architecture and traffic edits are saved after 500 ms of inactivity and flushed when the page is hidden or left. The header reports “Saved locally” only after a successful write; storage failures recommend JSON export. Telemetry updates do not trigger writes.

A valid shared URL takes precedence on startup, then a validated local draft, then the starter architecture. An empty saved canvas remains empty on reload. Editing a shared design removes its stale URL hash after saving so the next reload restores the edited draft. Use Share again to create an updated link.

Drafts use the same bounded migration and validation boundary as JSON import. Unreadable content is retained under `syssim_workspace_unreadable_draft` when storage allows, before a starter replaces the active draft. Clearing browser site data removes both draft keys, snapshots, and learning preferences. Clearing the canvas saves an empty draft; it does not erase manual snapshots or the unreadable backup.

## Experiment summaries

Stop captures the worker's confirmed final metrics, or the latest completed fallback tick. Starting after Stop resets modeled time and counters for a separate experiment; Pause/Resume continues the current experiment. Reset cancels the active experiment but leaves saved summaries available.

Run history retains ten session-local results and preserves a pinned baseline within that limit. Each result records its starting architecture, workload, seed, duration, engine version, and whether settings changed or chaos ran. Restoring a starting setup resets simulation state and turns chaos off; it does not replay mid-run edits or failures.

Comparisons show absolute deltas and flag differing workloads, durations, engines, mid-run changes, chaos, and low successful-request counts. Successful p95 is the engine's rolling sample statistic; no successes display “No samples.” Match modeled duration, workload, and seed, and change one architecture setting at a time for a more controlled experiment.
