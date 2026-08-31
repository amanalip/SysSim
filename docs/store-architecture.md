# Store architecture and action side effects

The Zustand store is organized as seven cohesive domains even though they are composed into one
hook. UI owns view preferences; graph owns nodes, edges, zones, selection, and history; simulation
owns runtime inputs and telemetry; scenario owns the active exercise and progress; persistence owns
browser storage boundaries; toast owns transient feedback; calculator owns capacity assumptions.

Pure graph transformations live in `src/store/graph-operations.ts`, fresh reset objects in
`src/store/slices/initial-state.ts`, and reusable subscription boundaries in
`src/store/selectors.ts`. Components should select only the smallest domain fields they render.

## Action side effects

| Domain      | Actions with side effects                 | Side effect and failure behavior                                                                                              |
| ----------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| UI          | `setTheme`, `setKeyboardShortcutsEnabled` | Writes a preference to localStorage and shows a warning toast if storage is unavailable. Theme also updates the root element. |
| Graph       | graph mutations, undo/redo, load/clear    | Notifies the simulation command bus after the atomic store update. History snapshots are structured clones.                   |
| Simulation  | traffic changes, reset                    | Notifies the runtime bridge; reset requests fresh metrics and request collections.                                            |
| Scenario    | completion and progress actions           | Writes bounded progress records to localStorage; a warning toast reports write failure.                                       |
| Persistence | import/load/export callers                | Validates and migrates at the boundary before store writes. Corrupt reads recover to an empty or marked-corrupt state.        |
| Toast       | `addToast`                                | Schedules removal of the generated toast ID.                                                                                  |
| Calculator  | `setCalculatorInputs`                     | Store-only update; formulas remain pure in `analysis/capacity-calculator.ts`.                                                 |

No selector, initial-state factory, or graph operation performs browser I/O. Runtime bridge calls
are kept in action bodies so pure operations remain deterministic and unit-testable.
