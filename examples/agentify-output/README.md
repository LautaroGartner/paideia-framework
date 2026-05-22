# agentify demo outputs

These checked-in bundles show how `agentify` reports different kinds of sites with the same static HTML crawler.

## Demos

* `paideia-blog/`: deterministic crawl of the built Paideia blog output.
* `static-content-site/`: complete crawl of a small static content fixture.
* `marketing-site/`: partial crawl of a landing-page fixture with a blocked demo route.
* `js-heavy-spa/`: JavaScript-heavy app shell fixture with sparse static metadata.

## What to inspect

Each directory contains:

```txt
system.json
runtime.json
context.json
llms.txt
```

`runtime.json` is the fastest place to see crawl status, renderer identity, limitation receipts, warning codes, and failures.
