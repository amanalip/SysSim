# Security Policy

## Supported version

Security fixes are applied to the latest commit on `main`. SysSim is a static, client-side
educational simulator deployed through GitHub Pages; it has no application backend or server-side
secret store.

## Security boundaries

URL hashes, imported architecture and snapshot files, localStorage content, and future shared
content are untrusted. They must be size-bounded, schema-validated, migrated through supported
versions, and rejected before reaching application state when unsafe. Architecture exports and
diagnostic reports must not unexpectedly disclose credentials, secrets, tokens, private keys,
scenario notes, traces, or architecture configuration.

The simulation engine must bound nodes, edges, scheduled events, generated arrivals, retained
requests, text, numeric values, and worker messages so hostile input cannot cause unbounded work or
memory growth. Worker failure must fall back safely without treating failed operations as
successful.

## Reporting a vulnerability

Use the repository Security tab and GitHub private vulnerability reporting when available. Include
the affected version, impact, reproduction steps, and a minimal proof of concept. Do not include
real credentials, private architecture data, or public exploit details.

If private vulnerability reporting is unavailable, contact the repository owner through their
GitHub profile with a request for a private reporting channel. Do not open a public issue containing
exploit details. You may open a non-sensitive public issue stating only that you need a private
security contact.

Please allow a reasonable period for validation and remediation before public disclosure. Reports
made in good faith to improve SysSim are welcome.

## Reportable issues

Examples include script execution or markup injection, prototype pollution, validation bypass for
imported/shared state, unintended sensitive-data disclosure, dependency or workflow compromise,
and practical denial of service that bypasses documented resource bounds.

Ordinary bugs, educational-model inaccuracies, missing production guarantees, and failures that
remain within the published performance envelope are normally not security vulnerabilities unless
they cross a security boundary above.

## Deployment limitations

The repository defines a static-page Content Security Policy and Referrer Policy. GitHub Pages does
not permit this project to configure every HTTP response header; `X-Content-Type-Options` and
Permissions Policy therefore require a hosting layer that supports custom headers. See
`docs/browser-security.md`.
