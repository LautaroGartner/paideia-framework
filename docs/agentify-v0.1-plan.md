# agentify v0.1 plan

Goal:

```bash
npx agentify https://example.com
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

## Non-goals

v0.1 should not:

* crawl huge sites
* execute login flows
* infer private backend behavior
* generate code
* deploy anything
* claim security guarantees
* replace real documentation

## Inputs

Required:

* public URL

Optional later:

* crawl depth
* route limit
* output directory
* site name override
* include/exclude path patterns

## v0.1 behavior

1. Fetch the starting URL.
2. Extract title, description, canonical URL, links, and visible headings.
3. Follow a small bounded set of same-origin links.
4. Classify discovered routes.
5. Write an explanation bundle to `agent/`.
6. Print a short summary.

Default limits should be boring:

```txt
max routes: 25
max depth: 1
same origin only: true
output directory: agent/
```

## Artifact shape

`system.json`:

* source URL
* discovered routes
* generated artifact list
* crawl limits
* caveats

`runtime.json`:

* agentify version
* generated timestamp
* build ID
* artifact inventory
* declared capabilities
* diagnostics summary

`context.json`:

* site title and description
* compact route map
* page summaries from metadata/headings
* suggested reading order

`llms.txt`:

* human-readable entrypoint
* where to start
* what files exist
* known limitations

## Diagnostics

v0.1 should report:

* fetch failures
* non-HTML responses
* redirects
* duplicate canonical URLs
* missing titles
* missing descriptions
* routes skipped by limit

Diagnostics should be warnings unless they prevent bundle generation.

## CLI sketch

```bash
npx agentify https://example.com
npx agentify https://example.com --out agent
npx agentify https://example.com --max-routes 10
```

Output:

```txt
[agentify] fetched 8 routes
[agentify] wrote agent/system.json
[agentify] wrote agent/runtime.json
[agentify] wrote agent/context.json
[agentify] wrote agent/llms.txt
[agentify] diagnostics: 2 warnings, 0 errors
```

## Open questions

* Should `agentify` live inside Paideia first or start as a separate package?
* Should route summaries use only deterministic metadata in v0.1?
* Should the artifact schema mirror Paideia exactly or use a smaller portable subset?
* Should generated bundles include raw HTML excerpts, or only metadata and summaries?

## First milestone

Before coding, define the artifact schemas and one fixture site.

The smallest useful demo is:

```bash
npx agentify https://paideia-framework.example
```

Then inspect:

```bash
tree agent
cat agent/llms.txt
cat agent/context.json
```
