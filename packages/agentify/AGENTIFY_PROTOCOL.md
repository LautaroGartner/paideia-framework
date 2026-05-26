# Agentify Protocol

Status: alpha. This document describes the `0.1` artifact schema emitted by `@lautarogartner/agentify@0.7.1-alpha.2`.

## 1. Purpose

Agentify defines a small machine-readable receipt layer for observable website crawl state.

The protocol does not attempt to infer private behavior or hidden application state. It records what was directly observable during a crawl: fetched routes, failed routes, renderer mode, diagnostics, discovery metadata, and artifact integrity.

The goal is interoperability. A consumer should be able to read an Agentify artifact bundle and understand what was observed, how it was observed, what was not observed, and whether the bundle validates.

## 2. Core Concepts

Observable state is the state Agentify can directly observe from public network responses during a crawl. It includes response metadata, HTML-derived route metadata, crawl failures, warning diagnostics, and explicit limitations.

Crawl receipts are structured records of fetch observations. Route receipts record URL, final URL, HTTP status, content type, timing, redirect state, canonical URL, discovery source, and crawl depth. Sitemap discovery is recorded separately under `crawl.sitemap`.

Renderer modes describe the environment that produced the observation. The current renderer is `static-html`, meaning Agentify fetches HTML and does not execute JavaScript.

Warnings are non-fatal diagnostics. They explain incomplete or degraded observations while preserving generated artifacts. Warnings do not make validation fail by themselves.

Limitations are explicit boundaries of the observation model. For example, JavaScript is not executed, private behavior is not inferred, and robots rules are recorded for awareness rather than enforced.

Validation checks whether the artifact bundle is internally consistent: required files exist, schema versions match, renderer metadata is valid, route counts agree, receipts are present, and artifact byte counts and hashes match.

Artifacts are the four files emitted into an Agentify bundle:

```txt
system.json
runtime.json
context.json
llms.txt
```

## 3. Artifact Definitions

### `system.json`

`system.json` is the structural site contract. It contains the source URL, generator identity, renderer metadata, limitations, site metadata, full route metadata, crawl status, crawl receipts, capabilities, diagnostics, warnings, and caveats.

Use `system.json` when a consumer needs the broadest machine-readable view of what Agentify observed.

### `runtime.json`

`runtime.json` is the generation and runtime integrity contract. It contains generator identity, schema version, source URL, renderer metadata, route counts, crawl metadata, diagnostics, warning summaries, and the artifact inventory.

Each artifact inventory entry includes:

```json
{
  "path": "system.json",
  "kind": "agent-metadata",
  "bytes": 1234,
  "sha256": "..."
}
```

`runtime.json` also contains its own artifact entry. To avoid an impossible self-hash loop, the `runtime.json` hash is computed from the runtime JSON with the `runtime.json` artifact `sha256` value replaced by 64 zeroes before hashing. Validators must use the same convention.

### `context.json`

`context.json` is the compact semantic summary. It contains source identity, renderer metadata, warning codes, crawl summary, route summaries, route metadata, and a suggested reading order for the bundle.

Use `context.json` when a consumer needs enough information for indexing, browsing, or lightweight agent context without reading the full system contract.

### `llms.txt`

`llms.txt` is the human-readable entrypoint. It summarizes the site, source URL, crawl status, route list, warning codes, crawl failures, and limitations in plain text.

`llms.txt` is advisory. The JSON artifacts are the normative protocol surface.

## 4. Crawl Semantics

Agentify currently performs a static HTML crawl.

Current crawl behavior:

* The source URL is normalized. Bare domains are treated as HTTPS URLs.
* Crawling is same-origin only.
* The crawl depth is currently one homepage plus same-origin links discovered from the homepage.
* JavaScript is not executed.
* Route metadata is extracted from static HTML.
* Redirect metadata is recorded when provided by the fetch layer.
* Canonical URLs are detected from `<link rel="canonical">` when present.
* `robots.txt` is fetched or recorded for awareness. Directives are not enforced in the current alpha.
* `sitemap.xml` discovery checks `/sitemap.xml`, `Sitemap:` hints in `robots.txt`, and homepage `<link rel="sitemap">` hints.
* A failed route does not prevent artifact generation.
* A crawl with failed routes is `partial`.
* A crawl with no failed routes is `complete`.

Failures are preserved in `crawl.failures`. Successful page fetches are preserved in `crawl.receipts`. Sitemap discovery is preserved in `crawl.sitemap`.

## 5. Warning Taxonomy

Warnings are informational diagnostics with severity `warning`. They are designed to preserve trust by making incomplete observations visible.

### `route.fetch_failed`

Meaning: a route could not be fetched.

Expected behavior: Agentify records the failure in `crawl.failures`, emits a warning, and continues generating artifacts.

Validation: does not fail validation.

Display labels: when a failed route includes an HTTP status, CLI output may display an HTTP-specific label such as `http.429`. In the current schema, `http.429` is a presentation label derived from `route.fetch_failed` plus `status: 429`, not a separate stored diagnostic code.

### `crawl.partial`

Meaning: one or more discovered routes failed to fetch.

Expected behavior: `crawl.status` is `partial`; generated artifacts remain valid if internally consistent.

Validation: does not fail validation.

### `missing.title`

Meaning: a fetched route did not include a `<title>`.

Expected behavior: Agentify records the missing metadata and continues.

Validation: does not fail validation.

### `missing.description`

Meaning: a fetched route did not include a meta description.

Expected behavior: Agentify records the missing metadata and continues.

Validation: does not fail validation.

### `js.required`

Meaning: a route appears to require JavaScript for meaningful static content.

Expected behavior: Agentify records the limitation and keeps the route in the artifact bundle.

Validation: does not fail validation.

## 6. Renderer Modes

Current renderer metadata:

```json
{
  "mode": "static-html",
  "javascriptExecuted": false
}
```

`static-html` means Agentify fetched HTML and did not execute JavaScript.

Reserved future modes may include:

* `browser-rendered`: a browser environment executed JavaScript before observation.
* `hybrid`: multiple renderer observations were combined.

Consumers must treat unknown renderer modes as meaningful protocol data rather than assuming static behavior.

## 7. Validation Semantics

`agentify validate ./agent` checks bundle integrity.

Validation currently expects:

* all required artifacts exist
* JSON artifacts use the supported `artifactSchemaVersion`
* generator metadata identifies Agentify
* renderer metadata is structurally valid
* route counts match across JSON artifacts
* failed route counts match across JSON artifacts
* `runtime.json` lists all required artifacts
* artifact byte counts match actual file contents
* artifact SHA-256 hashes match actual file contents
* `runtime.json` self-hash uses the 64-zero placeholder convention
* crawl receipt count matches `routeCount`
* crawl receipts include URL, HTTP status, and content type

Validation failure means the bundle is internally inconsistent. Warnings inside a valid bundle do not imply validation failure.

Current CLI exit behavior:

```txt
0 = command completed successfully
1 = invalid usage, failed command, or validation failure
```

More granular exit codes are expected before CI-oriented stable releases.

## 8. Non-Goals

Agentify is not:

* a browser automation framework
* a vulnerability scanner
* a private behavior inference tool
* an AI summarization system
* authenticated scraping infrastructure
* bot bypass tooling
* a generic SEO crawler

The protocol is intentionally narrower: explicit machine-observable runtime receipts for public website crawl state.

## 9. Compatibility

The current artifact schema version is `0.1`.

During the alpha period, schema details may change. Compatible consumers should check `artifactSchemaVersion`, inspect renderer metadata, and run validation before relying on a bundle.

The long-term compatibility goal is for validators, CI integrations, and other generators to implement this protocol independently of the Agentify CLI.
