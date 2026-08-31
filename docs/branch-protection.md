# Main branch protection

Protect `main` with pull requests and require these exact status checks before merge:

- `Quality / static checks`
- `Tests / unit, integration, accessibility, coverage`
- `Build / production and budgets`
- `Security / dependency audit`
- `E2E / chromium`
- `E2E / firefox`
- `E2E / webkit`

Also dismiss stale approvals when new commits are pushed, require conversations to be resolved, block force pushes and deletion, and require the branch to be current before merging. The Pages deployment is intentionally triggered only after the `CI` workflow completes successfully for a push to `main`.
