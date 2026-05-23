# agentify output: js-heavy-spa

This directory contains an example agent-readable bundle for `https://x.example/`.

## Crawl result

Status: `partial`

Fetched: `1`

Failed: `1`

Warnings: `crawl.partial`, `js.required`, `missing.description`, `missing.title`, `route.fetch_failed`

## What this demonstrates

* JavaScript-required limitations
* honest partial crawl reporting
* missing metadata warnings
* sparse static HTML when meaningful content is rendered client-side
* explicit receipts about what the static crawler could and could not observe

## Files

```txt
system.json
runtime.json
context.json
llms.txt
README.md
```

This demo is the contrast case: the useful output is not that agentify extracted a lot, but that it records the limits honestly.
