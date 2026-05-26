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

## Successful live output

```txt
0.7.2-alpha.2
[agentify] fetched 6 pages
[agentify] warnings: 0
[agentify] errors: 0
[agentify] output:
- /Users/lautarogartner/framework/packages/agentify/agent/system.json
- /Users/lautarogartner/framework/packages/agentify/agent/runtime.json
- /Users/lautarogartner/framework/packages/agentify/agent/context.json
- /Users/lautarogartner/framework/packages/agentify/agent/llms.txt
Agentify Runtime Explanation
----------------------------

Source
  https://www.lautarogartner.com/

Renderer
  static-html
  javascript executed: no

Crawl
  status: complete
  pages fetched: 6
  failed routes: 0

Discovery
  robots.txt: yes
  sitemap.xml: yes

Warnings
  none

Artifacts
  context.json
  llms.txt
  runtime.json
  system.json

Integrity
  validation: passed
  artifact schema: 0.1
[agentify] validation passed
```
