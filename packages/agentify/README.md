# agentify

Generate agent-readable runtime artifacts for a website.

```bash
npx agentify https://example.com
```

Outputs:

```txt
agent/
  system.json
  runtime.json
  context.json
  llms.txt
```

agentify performs a static HTML crawl and records what it could and could not observe.
