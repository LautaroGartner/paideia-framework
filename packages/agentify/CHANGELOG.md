# Changelog

## 0.7.2-alpha.2

- Updated package docs and smoke assertions for the next alpha cut.
- Documented `--delay-ms` and `--retries` in package examples.
- Refreshed current-version fixtures and package smoke expectations.

## 0.7.2-alpha.1

- Added canonical protocol fixtures.
- Added fixture validation coverage.
- Included fixtures in the npm package.

## 0.7.1-alpha.2

- Added sitemap discovery through `/sitemap.xml`, `robots.txt`, and homepage sitemap links.
- Added sitemap discovery receipts to runtime artifacts.
- Updated `agentify explain` discovery output to reflect recorded sitemap state.

## 0.7.1-alpha.1

- Added `agentify explain [agent]`.
- Added a human-readable runtime explanation for source, renderer, crawl, discovery, warnings, artifacts, and validation status.

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
