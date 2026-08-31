# Type-modeling decisions

React Flow uses shared `CanvasNode` and `CanvasEdge` generics. Transport documents remain `unknown`
until runtime validation returns a `SerializedCanvasState`. Worker commands and responses are
discriminated unions, and traffic pattern dispatch uses a `never` assertion.

Branded node, edge, zone, request, and scenario IDs were evaluated. They are deferred because the
current JSON schema deliberately permits plain string IDs and branding only selected internal paths
would create misleading partial safety. Boundary helper types and validators provide the useful
protection today; brands should be introduced only with a schema migration and end-to-end adoption.

Runtime enums are derived from shared definitions (`COMPONENT_METADATA_LIST`, `EDGE_PURPOSES`, and
`SUPPORTED_EDGE_PROTOCOLS`) and are covered by schema synchronization tests.
