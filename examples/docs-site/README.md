# Paideia Docs Example

A small generated documentation site built with Paideia.

This example uses Paideia's existing writing system as structured docs pages. It is intentionally small: two docs pages, generated navigation, and the same runtime artifacts as any Paideia site.

## Run locally

```bash
npm install
npm run build
npm run start
```

Then open:

```txt
http://localhost:3000
```

## Inspect the runtime

```bash
npm run inspect
npm run doctor
```

## Generated artifacts

```txt
dist/
  index.html
  about/index.html
  getting-started/index.html
  runtime-artifacts/index.html
  runtime.json
  system.json
  context.json
  llms.txt
```
