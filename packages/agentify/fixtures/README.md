# Agentify Protocol Fixtures

Canonical artifact bundles for the Agentify `0.1` protocol.

Each fixture contains:

```txt
system.json
runtime.json
context.json
llms.txt
```

## Fixtures

* `complete-static-site/`: complete static crawl with two fetched routes and no warnings.
* `partial-js-site/`: JavaScript-required app shell with explicit static-renderer limitations.
* `rate-limited-site/`: partial crawl with an HTTP 429 failed route.
* `missing-metadata-site/`: static route missing title and description metadata.
* `redirected-site/`: route receipt with redirect metadata and canonical URL.

These fixtures are intended for:

* regression tests
* interoperability references
* schema examples
* external validator checks
* future protocol compatibility reviews

Validate all fixtures from the repository root:

```bash
npm run test:agentify-fixtures
```
