# Changelog

## 0.7.0-alpha.1

- Added `agentify validate [agent]`.
- Added structured renderer metadata.
- Added deterministic artifact hashes.
- Added crawl receipts with status, content type, timing, redirect, canonical URL, discovery, and depth metadata.
- Added validation coverage for artifact integrity.

## 0.6.0-alpha.3

- Added bare-domain URL normalization.
- Added visible warning output after crawl.
- Grouped generated artifact paths under output.
- Added `agentify inspect [agent]`.
- Added package smoke coverage for partial crawls and inspect.

## 0.6.0-alpha.2

- Added `--delay-ms`
- Added `--retries`
- Improved HTTP 429 guidance
- Added retry regression coverage

## 0.6.0-alpha.1

Initial package-boundary release candidate.

* Adds standalone `agentify` package metadata.
* Exposes `bin/agentify.mjs` as the package CLI entry.
* Keeps the crawler static and receipt-oriented.
* Documents generated artifacts: `system.json`, `runtime.json`, `context.json`, and `llms.txt`.
