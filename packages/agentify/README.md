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

agentify performs a **static HTML crawl** (JavaScript is not executed) and records what it could and could not observe. The generated artifacts are honest receipts: they include crawl status, metadata, warnings, failures, and explicit limitations instead of hiding partial results.
