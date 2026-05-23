# agentify output: docs-site

This directory contains an example agent-readable bundle for `https://lautarogartner.com/`.

It was generated from the local built Paideia blog artifacts with:

```bash
node scripts/agentify.mjs https://lautarogartner.com --out examples/agentify-output/docs-site --max-pages 10 --user-agent "agentify/0.5 demo"
```

The checked-in demo uses local HTML fixtures from `dist/` so the example is deterministic and does not depend on live crawl rate limits.

## Crawl result

Status: `complete`

Fetched: `5`

Failed: `0`

Warnings: none

## What this demonstrates

* multi-page crawl
* structured headings
* route inventories
* deterministic artifact output from a built docs/blog site

## Files

```txt
system.json
runtime.json
context.json
llms.txt
README.md
```

`runtime.json` records the crawl receipt. `context.json` is the compact route inventory for agents.
