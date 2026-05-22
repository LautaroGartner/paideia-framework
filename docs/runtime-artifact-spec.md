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
* `renderer`: renderer identity such as `static-html` when known
* `limitations`: explicit limitation receipt when known
* `source`: object with `url` and `origin`
* `site`: object with `title` and `description`
* `routes`: array of route objects
* `capabilities`: array of strings

Route fields:

* `path`: route path such as `/about`
* `url`: absolute URL when known
* `title`: page title when found
* `description`: page description when found
* `headings`: visible heading text extracted from the page

Optional fields:

* `crawl`: crawl limits and crawl receipt
* `diagnostics`: warnings and errors
* `caveats`: human-readable limits of what was inferred

Semantics:

`system.json` should describe what is known about the system, not what the generator wishes were true.

## `runtime.json`

Purpose:

Records generation or crawl identity.

Required fields:

* `generator`: object with `name` and `version`
* `generatedAt`: ISO timestamp
* `renderer`: renderer identity such as `static-html` when known
* `limitations`: explicit limitation receipt when known
* `buildId`: deterministic or stable fingerprint when possible
* `artifacts`: generated artifact inventory
* `capabilities`: array of strings

Artifact fields:

* `path`: artifact path
* `kind`: artifact role
* `bytes`: byte size of the emitted artifact

Optional fields:

* `crawl`: crawl receipt
* `diagnostics`: summary of warnings and errors

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
* `failures`: array of failed route records
* `sameOriginOnly`: whether crawl was limited to one origin
* `userAgent`: user agent used for fetching
* `robots`: robots.txt awareness receipt

Failure fields:

* `url`: failed URL
* `status`: HTTP status when available
* `message`: failure message

Semantics:

A partial crawl is still useful if the failure is explicit.

## `context.json`

Purpose:

Gives agents a compact map of the site.

Required fields:

* `generatedAt`
* `sourceUrl`
* `renderer`
* `limitations`
* `routeCount`
* `failedRouteCount`
* `site`
* `routeSummaries`
* `routes`

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
* `robotsEnforced`: robots.txt directives were not enforced

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
```

Warning codes should stay compact and stable enough for humans and agents to filter, compare, and explain.

## Design Constraint

The artifacts should not overclaim.

They should expose what happened, what exists, what failed, and what limits shaped the output.
