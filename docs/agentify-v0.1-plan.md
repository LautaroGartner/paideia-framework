# agentify prototype notes

`agentify` is an experimental utility inside the Paideia repo.

Goal:

```bash
node scripts/agentify.mjs https://example.com --out agent --max-pages 5
```

Output:

```txt
agent/
  system.json
  runtime.json
  context.json
  llms.txt
```

## Product promise

Given a public website URL, generate a small agent-readable explanation bundle.

The bundle should help a human or agent understand what was found without pretending to have full private knowledge of the site.

## Current prototype

The current prototype can:

* fetch a homepage
* discover same-origin links from that homepage
* crawl linked pages at depth 1
* cap crawls at `maxPages`
* extract title, description, and headings per route
* write `system.json`, `runtime.json`, `context.json`, and `llms.txt`
* record crawl status as `complete` or `partial`
* keep 403, 429, 500, timeout, and other fetch failures visible in crawl receipts
* fetch or record `robots.txt` awareness without enforcing directives yet
* write visible demo output under `examples/agentify-output/`

Default limits are intentionally small:

```txt
max pages: 10
max depth: 1
same origin only: true
output directory: agent/
```

## CLI

```bash
node scripts/agentify.mjs https://example.com
node scripts/agentify.mjs https://example.com --out agent
node scripts/agentify.mjs https://example.com --max-pages 5
node scripts/agentify.mjs https://example.com --user-agent "agentify/0.4"
node scripts/agentify.mjs https://example.com --verbose
```

## Artifact shape

`system.json`:

* source URL and origin
* discovered routes
* route metadata
* crawl limits and caveats
* capabilities such as `site.crawled`, `routes.discovered`, `metadata.extracted`, and `crawl.receipts`

`runtime.json`:

* agentify version
* generated timestamp
* build ID
* artifact inventory
* declared capabilities
* crawl receipt with fetched and failed route counts
* failure details when the crawl is partial

`context.json`:

* generated timestamp
* source URL
* route count
* failed route count
* site title and description
* compact route summaries
* route headings

`llms.txt`:

* plain-language entrypoint
* site summary
* route list
* crawl status
* generated-by note
* failure note when the crawl is partial

## Non-goals

The prototype should not yet:

* crawl huge sites
* recurse beyond depth 1
* execute login flows
* infer private backend behavior
* generate code
* deploy anything
* claim security guarantees
* replace real documentation

## Demo

Checked-in demo output lives at:

```txt
examples/agentify-output/paideia-blog/
```

That demo is generated from local built Paideia blog HTML so it remains deterministic even when the live site rate-limits crawler requests.

## Open questions

* Should `agentify` stay inside Paideia until the artifact shape stabilizes?
* Should robots.txt move from awareness to enforcement?
* Should route summaries remain deterministic metadata only?
* Should generated bundles include raw HTML excerpts, or only metadata and summaries?
* Should a future package use the same schema names as Paideia native artifacts?
