# agentify output: Paideia blog

This directory contains an example agent-readable bundle for `https://lautarogartner.com/`.

It was generated from the local built Paideia blog artifacts with:

```bash
node scripts/agentify.mjs https://lautarogartner.com --out examples/agentify-output/paideia-blog --max-pages 10 --user-agent "agentify/0.4 demo"
```

The checked-in demo uses local HTML fixtures from `dist/` so the example is deterministic and does not depend on live crawl rate limits.

## Files

* `llms.txt`: plain-language entrypoint with site summary, routes, crawl status, and failure notes.
* `context.json`: compact agent context with route count, failed route count, route summaries, headings, and crawl receipt.
* `system.json`: discovered site contract with routes, metadata, capabilities, and crawl caveats.
* `runtime.json`: generation receipt with build ID, artifact inventory, crawl status, and failures.

## Crawl Status

The current demo crawl status is `complete`.

When a crawl is partial, `runtime.json` records failed route count and failure details instead of hiding the problem.
