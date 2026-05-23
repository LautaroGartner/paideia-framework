# agentify demo outputs

These checked-in bundles show how `agentify` reports different kinds of sites with the same static HTML crawler.

## Demos

* `static-site/`: complete crawl of a small static content fixture with rich metadata.
* `docs-site/`: deterministic multi-page crawl of the built Paideia blog output.
* `js-heavy-spa/`: JavaScript-heavy app shell fixture with sparse static metadata and explicit limitation warnings.

## What to inspect

Each directory contains:

```txt
system.json
runtime.json
context.json
llms.txt
README.md
```

`runtime.json` is the fastest place to see crawl status, renderer identity, limitation receipts, warning codes, and failures.
