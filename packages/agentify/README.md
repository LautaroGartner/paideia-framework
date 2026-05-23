# agentify

Generate agent-readable runtime artifacts for a website.

**Status:** Alpha. Schema and outputs may change. Not for production use yet.

```bash
npx agentify https://example.com
```

Install from the Paideia repository while the package is incubating:

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
