# Persistence, Import, Export, and Privacy

## Canonical architecture document

An architecture JSON document contains `version`, `appVersion`, `engineVersion`, nodes, edges, zones, traffic configuration, and non-sensitive simulation metadata. It does not contain active requests, traces, metrics history, undo history, toasts, modal state, or secrets. Unknown root and nested fields are rejected.

The import boundary applies byte, depth, collection, identifier, coordinate, numeric, and string limits before migration. Supported historical versions are migrated without mutating caller-owned input. Migration tests cover every supported version and the strict validator runs again after migration.

## Storage surfaces

| Surface           | Contents                                                        | Lifetime                  | Privacy implication                           |
| ----------------- | --------------------------------------------------------------- | ------------------------- | --------------------------------------------- |
| JSON export       | Canonical architecture and traffic assumptions                  | User-managed file         | May reveal internal names and topology        |
| PNG export        | Visible canvas                                                  | User-managed file         | May reveal labels and layout                  |
| Share URL hash    | Compressed canonical architecture                               | Browser history/clipboard | Avoid pasting into public tickets or chats    |
| Snapshot slots    | Canonical architecture and traffic assumptions                  | Browser localStorage      | Remains on that browser profile until cleared |
| Scenario progress | Completion and notes                                            | Browser localStorage      | Notes may contain user-entered information    |
| Diagnostic export | Version, browser, graph counts, seed, runtime/performance state | User-managed file         | Intentionally excludes topology and content   |

The application is static and has no application backend. A URL fragment is not part of the HTTP request, but browser extensions, client-side analytics, screenshots, clipboard history, and recipients can still observe it.

## Migration policy

1. Add a migration before changing the current schema version.
2. Preserve all supported fields and supply documented defaults for new fields.
3. Add a fixture for every historical version and a maximum-size round trip.
4. Reject future versions with a clear message rather than guessing.
5. Keep engine-version metadata separate from the persistence schema version.

Snapshots restore architecture and traffic configuration, then reset simulation runtime state. They never resume an in-flight worker execution.
