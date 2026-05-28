# Runtime artifact notes

This is a practical draft for the files Paideia generates natively and `agentify` can retrofit onto an existing site.

It is not a standard. It is a working convention for software that explains itself.

## Goals

Runtime artifacts should help a human or agent answer:

* What site or system is this?
* What routes or generated outputs exist?
* What capabilities are declared?
* What happened during generation or crawling?
* What failed?
* Which file should I read first?

## `system.json`

Purpose:

Describes the discovered or generated system.

Required fields:

* `generator`: object with `name` and `version`
* `artifactSchemaVersion`: artifact schema version string
* `generatedAt`: ISO timestamp
* `sourceUrl`: canonical URL that was crawled
* `renderer`: renderer identity such as `static-html` when known
* `limitations`: explicit limitation receipt when known
* `routeCount`: number of successfully described routes
* `failedRouteCount`: number of failed route fetches
* `source`: object with `url` and `origin`
* `site`: object with `title` and `description`
* `routes`: array of route objects
* `crawl`: crawl limits and crawl receipt
* `capabilities`: array of strings
* `diagnostics`: summary object with `status`, `warnings`, `errors`, and `codes`
* `warnings`: array of warning objects

Route fields:

* `path`: route path such as `/about`
* `url`: absolute URL when known
* `title`: page title when found
* `description`: page description when found
* `headings`: visible heading text extracted from the page

Semantics:

`system.json` should describe what is known about the system, not what the generator wishes were true.

## `runtime.json`

Purpose:

Records generation or crawl identity.

Required fields:

* `generator`: object with `name` and `version`
* `artifactSchemaVersion`: artifact schema version string
* `generatedAt`: ISO timestamp
* `sourceUrl`: canonical URL that was crawled
* `renderer`: renderer identity such as `static-html` when known
* `limitations`: explicit limitation receipt when known
* `routeCount`: number of successfully described routes
* `failedRouteCount`: number of failed route fetches
* `buildId`: deterministic or stable fingerprint when possible
* `artifacts`: generated artifact inventory
* `capabilities`: array of strings
* `crawl`: crawl receipt
* `diagnostics`: summary object with `status`, `warnings`, `errors`, and `codes`
* `warnings`: array of warning objects

Artifact fields:

* `path`: artifact path
* `kind`: artifact role
* `bytes`: byte size of the emitted artifact

Semantics:

`runtime.json` should make the production of the artifact bundle inspectable. If generation was partial, it should say so.

## Crawl Receipt

Purpose:

Makes crawl behavior visible.

Fields:

* `status`: `complete` or `partial`
* `maxDepth`: crawl depth limit
* `maxPages`: page limit
* `timeoutMs`: fetch timeout
* `fetched`: number of pages fetched
* `failed`: number of failed routes
* `skipped`: number of routes skipped before fetch
* `failures`: array of failed route records
* `receipts`: fetched route receipts plus explicit skip receipts
* `sameOriginOnly`: whether crawl was limited to one origin
* `userAgent`: user agent used for fetching
* `robots`: robots.txt fetch and enforcement receipt

Failure fields:

* `url`: failed URL
* `status`: HTTP status when available
* `message`: failure message

Semantics:

A partial crawl is still useful if the failure is explicit.

When robots rules disallow a route, the URL should not be fetched. The skip remains useful protocol data and should be preserved with `skipped: true`, a reason, and the matched robots rule.

## Warnings

Purpose:

Makes non-fatal crawl and metadata issues inspectable.

Fields:

* `code`: stable warning code
* `path`: route path related to the warning, or `*` for bundle-level warnings
* `message`: human-readable explanation
* `status`: HTTP status when the warning describes a failed fetch

Semantics:

`warnings` is the normalized warning list. `diagnostics` is a compact summary for counts and codes. Warnings should always be objects, not bare strings.

## `context.json`

Purpose:

Gives agents a compact map of the site.

Required fields:

* `generatedAt`
* `artifactSchemaVersion`
* `sourceUrl`
* `renderer`
* `limitations`
* `routeCount`
* `failedRouteCount`
* `warningCodes`
* `warnings`
* `site`
* `routeSummaries`
* `routes`
* `crawl`

Route summary fields:

* `path`
* `title`
* `description`
* `headingCount`

Semantics:

`context.json` should be smaller and easier to scan than `system.json`. It is the practical starting point for an agent that needs orientation.

## `llms.txt`

Purpose:

Plain-language entrypoint.

Expected sections:

* site title
* generated-by note
* site summary
* source URL
* crawl status
* route list
* artifact list
* crawl limits
* failure note when partial

Semantics:

`llms.txt` should be readable without tooling. It should point to the structured artifacts instead of trying to replace them.

## Capability Names

Current agentify capabilities:

```txt
site.crawled
routes.discovered
metadata.extracted
agent.context
agent.guide
crawl.receipts
```

Capability names should be short, concrete, and testable.

## Limitation Receipts

Purpose:

Records what the generator or crawler intentionally did not do.

Current agentify fields:

* `javascriptNotExecuted`: JavaScript was not run while reading the site
* `recursiveCrawl`: recursive crawling beyond depth 1 was not performed
* `privateBehaviorInferred`: private backend behavior was not inferred
* `robotsEnforced`: robots.txt directives were enforced when available

Semantics:

Limitation receipts should be explicit booleans, not buried in prose. A static crawl can still be useful, but the artifact must say what kind of crawl it was.

## Warning Codes

Current agentify warning codes:

```txt
missing.title
missing.description
js.required
crawl.partial
route.fetch_failed
robots.disallowed
```

Warning codes should stay compact and stable enough for humans and agents to filter, compare, and explain.

## Design Constraint

The artifacts should not overclaim.

They should expose what happened, what exists, what failed, and what limits shaped the output.
