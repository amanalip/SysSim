# Browser security controls

SysSim is a static, client-only GitHub Pages application. It sends architecture data only when a
user deliberately copies or navigates to an encoded share URL; simulations otherwise run locally in
a Web Worker.

## Enforced in the document

- The Content Security Policy permits same-origin application assets, data/blob images, workers,
  and development WebSocket connections. It blocks plugins, foreign scripts, and foreign fonts.
- `Referrer-Policy` is `no-referrer`, limiting accidental disclosure of URL-encoded architectures.
- External fonts were removed. System font stacks avoid a third-party request and remain compatible
  with the CSP.
- External documentation and citation links use `noopener noreferrer`.

## Hosting limitation

GitHub Pages does not expose repository-controlled HTTP response headers. Therefore
`X-Content-Type-Options: nosniff` and `Permissions-Policy` cannot be reliably set by this repository.
If SysSim moves behind a configurable CDN, configure those response headers there and keep the
document CSP as defense in depth.

## Share URL privacy

Share URLs contain architecture structure and configuration. The UI warns that links may remain in
browser history, logs, or referrers, rejects known secret-like field names, uses `no-referrer`, and
warns above an 8,000-character practical URL limit. Users should not place credentials or production
secrets in component names or configuration.
