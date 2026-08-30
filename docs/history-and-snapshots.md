# History and snapshot behavior

## History contract

One history entry is created before each semantic canvas operation: add, duplicate, delete, node drag, edge protocol/purpose/cut change, zone add/remove/update, configuration edit group, layout, clear, or architecture load. Selection and per-frame position rendering do not create entries. A node drag records once at drag start so the completed position can be undone without storing every frame. Rapid edits to the same component configuration within 750 ms form one undo group.

History stores nodes, complete edge data, and zones. Undo and redo clear transient selection, update their availability flags, advance the graph revision, and notify the simulation runtime exactly once. UI controls bind directly to `canUndo` and `canRedo`.

## Snapshot contract

There are five local slots. Every occupied slot records schema version, application version, architecture, edge semantics, zones, traffic configuration, and the restoration mode `architecture-and-traffic-reset-simulation`.

Local data is migrated and validated before display. A bad slot is shown as corrupted with its reason and cannot be loaded, but can be safely removed. Storage quota and availability failures produce visible error toasts. Blank names fall back to `Architecture Snapshot N`.

Loading intentionally resets in-flight simulation state and metrics, then restores architecture and traffic configuration. Runtime telemetry is never represented as if it were still valid for a restored graph. “Export all” and “Import all” provide one portable, versioned JSON collection; import validates every slot before persistence.
