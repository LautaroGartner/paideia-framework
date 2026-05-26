# agentify

Generate agent-readable runtime artifacts for a website.

**Status:** Alpha. Schema and outputs may change. Not for production use yet.

```bash
npx @lautarogartner/agentify https://example.com
```

Install from npm:

```bash
npm install -g @lautarogartner/agentify
agentify https://example.com
```

Or from the Paideia repository (during incubation):

```bash
npm install -g github:LautaroGartner/paideia-framework
agentify https://example.com
```

Package-local development:

```bash
cd packages/agentify
node bin/agentify.mjs https://example.com
```

Outputs:

```txt
agent/
  system.json
  runtime.json
  context.json
  llms.txt
```

Protocol contract:

```txt
AGENTIFY_PROTOCOL.md
```

Successful live example:

```bash
npx @lautarogartner/agentify@alpha --version
npx @lautarogartner/agentify@alpha https://www.lautarogartner.com
npx @lautarogartner/agentify@alpha explain ./agent
npx @lautarogartner/agentify@alpha validate ./agent
```

```txt
0.7.1-alpha.2
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

agentify performs a **static HTML crawl** (JavaScript is not executed) and records what it could and could not observe. The generated artifacts are honest receipts: they include crawl status, metadata, warnings, failures, and explicit limitations instead of hiding partial results.
