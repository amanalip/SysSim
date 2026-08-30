# Architecture schema and trust boundary

All imported, URL-decoded, restored, or locally persisted architectures pass through migration and runtime validation before application state is changed.

The current schema is version 10 and exports also identify application version 1.0.0. Versions 1 through 10 are supported: missing model defaults and edge purposes are filled deterministically, then the result is normalized to version 10. Newer or non-positive versions are rejected.

## Validation guarantees

- Node, edge, and zone arrays are bounded to 100, 500, and 100 entries.
- IDs use a restricted 120-character format and are unique within each entity kind.
- Component types, categories, health states, protocols, edge purposes, zone categories, traffic patterns, configuration enums, booleans, strings, collections, and numeric fields are checked.
- Numbers must be finite, non-negative where applicable, and below safe limits. Percentages are capped at 100; coordinates may be signed but are bounded; zone dimensions must be positive.
- Names must be non-blank and at most 120 characters. General text is capped at 2,000 characters and nested collections at 1,000 entries.
- Dangling edges are rejected for strict imports and may be explicitly repaired when loading older canvas data.
- Imported files are capped at 1 MB. Compressed URL payloads are bounded before decompression and decompressed state is capped at 2 MB.

Validation errors identify field paths such as `nodes[2].data.config.health` or `edges[0].target` so the user can correct the source. Malformed JSON, unsupported versions, duplicates, partial records, and excessive inputs fail closed without replacing the current canvas.
