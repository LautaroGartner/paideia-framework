# Paideia Framework

Inspectable website and application runtime framework.

Build software that humans and agents can understand.

Current version: `v1.7.2`
Runtime identity foundation

---

## Quickstart

Clone the repository:

```bash
git clone https://github.com/LautaroGartner/paideia-framework.git
cd paideia-framework
```

Install dependencies:

```bash
npm install
```

Build the site:

```bash
npm run build
```

Start the production runtime:

```bash
npm run start
```

Then open:

```txt
http://localhost:3000
```

Paideia generates explicit runtime artifacts alongside the site:

```txt
dist/
  index.html
  about/index.html
  runtime.json
  system.json
  context.json
  llms.txt
```

Create a new post:

```bash
node cli.mjs new post "My First Paideia Post"
```

Rebuild:

```bash
npm run build
```

Inspect the runtime:

```bash
node cli.mjs inspect
```

Run diagnostics:

```bash
node cli.mjs doctor
```

---

## What Paideia Generates

Paideia generates small inspectable systems.

The runtime intentionally exposes machine-readable artifacts so both humans and agents can understand:
- routes
- capabilities
- generated outputs
- runtime identity
- site structure

without reverse engineering the application.

---

## What Paideia Is

Paideia is an experimental framework for building:

* small inspectable websites
* structured writing systems
* agent-readable applications
* explicit runtime contracts
* token-friendly software

Paideia generates both:

* human-facing pages
* machine-readable runtime context

The goal is not abstraction for its own sake.

The goal is software that can explain itself.

---

## Current Capabilities

`v1.7.2` can currently generate and serve:

* static pages
* structured writing collections
* individual post pages
* generated navigation
* `404.html`
* `system.json`
* `runtime.json`
* `context.json`
* `llms.txt`
* deterministic build identity
* generated artifact inventory
* runtime capability declarations
* runtime diagnostics
* writing validation
* runtime inspection CLI
* post creation CLI workflow

Paideia now powers its own website runtime.

---

## Philosophy

Paideia is built around a few constraints:

* explicit contracts over hidden magic
* inspectable generated output
* small operational surfaces
* minimal dependencies
* AI-native, not AI-chaotic
* software understandable by humans and agents
* structure where mistakes are expensive
* flexibility where creativity matters

---

# Human + Agent Readability

Paideia applications expose structured runtime context.

Generated outputs currently include:

```txt
dist/
  index.html
  about/index.html
  <post>/index.html
  404.html
  system.json
  runtime.json
  context.json
  llms.txt
```

## `system.json`

Machine-readable runtime contract.

## `runtime.json`

Runtime identity, build metadata, and generated artifact inventory.

Includes:

* framework metadata
* deterministic build fingerprint
* generated artifact paths, kinds, and byte sizes
* runtime capability declarations
* site and writing counts
* normalized manifest status
* agent-readable runtime flags

## Runtime Capabilities

Generated systems declare what they can do:

```txt
site.static
writing.posts
runtime.inspect
runtime.identity
runtime.artifactInventory
manifest.validate
manifest.normalize
diagnostics.manifest
diagnostics.writing
agent.context
agent.guide
```

Capabilities are emitted in both `system.json` and `runtime.json`.
`paideia doctor` validates that the declarations are present, unique, and complete.

## `context.json`

Compressed runtime/site summary for agents.

Includes:

* site map
* writing summaries
* latest posts
* token-friendly metadata

## `llms.txt`

Human + agent guidance entrypoint.

---

# Website Runtime

The current runtime generates a minimal static website from explicit contracts.

Example:

```ts
export const site = defineSite({
  title: "Lautaro Gärtner",
  description: "Building Paideia Framework in public.",
  pages: [
    {
      path: "/",
      title: "Home",
      body: "Building Paideia Framework in public.",
    },
    {
      path: "/about",
      title: "About",
      body: "About Paideia and this site.",
    },
  ],
});
```

Writing is also contract-based:

```ts
export const post = {
  slug: "building-paideia",
  title: "Building Paideia",
  description: "Why I started building Paideia.",
  publishedAt: "2026-05-20",
  body: `
Paideia began as an experiment around inspectable runtimes,
minimal software systems, and explicit contracts.
`,
  tokenSummary:
    "Introduction post explaining the motivation behind Paideia Framework.",
};
```

---

# CLI

Current CLI surface:

```bash
paideia build
paideia start
paideia doctor
paideia inspect
paideia new post "Post title"
paideia --version
paideia --help
```

## Commands

### `paideia build`

Generates website artifacts into `dist/` and prints a structured build summary.

### `paideia start`

Starts the production runtime.

Default port:

```txt
3000
```

Custom port:

```bash
PAIDEIA_PORT=4000 paideia start
```

### `paideia doctor`

Validates generated runtime artifacts and runtime state.
Reports manifest contract failures with diagnostic codes, paths, and messages.

### `paideia inspect`

Prints the generated runtime identity summary, build ID, artifact kinds, capabilities, manifest status, and diagnostic status.

### `paideia new post`

Creates a new writing contract:

```bash
paideia new post "My Post"
```

Generates:

```txt
src/writing/my-post.ts
```

---

# Production Runtime

The runtime intentionally stays small and operationally explicit.

Current production behavior:

* deterministic static serving from `dist/`
* generated 404 handling
* graceful shutdown
* hardened path resolution
* explicit MIME handling
* method restrictions
* structured runtime logs
* health endpoint
* minimal trusted surface

Production excludes development tooling.

---

# Health Endpoint

Production exposes one operational endpoint:

```txt
GET /__paideia/health
```

Example:

```json
{
  "status": "ok",
  "framework": "paideia",
  "version": "1.7.2",
  "runtime": "production",
  "dist": "ready"
}
```

---

# Diagnostics

Run diagnostics:

```bash
paideia doctor
```

Current checks include:

* generated runtime artifacts
* `system.json`
* `runtime.json`
* `context.json`
* writing runtime structure
* generated pages
* generated post pages
* runtime logs
* writing validation
* manifest validation
* runtime identity validation
* capability validation
* artifact inventory validation

---

# Writing Diagnostics

Paideia validates writing contracts before generation.

Current validation includes:

* duplicate slugs
* missing title
* missing body
* invalid dates
* invalid collection shape
* warning-level missing descriptions
* warning-level missing token summaries

Diagnostics are explicit and structured.

---

# Testing

Current verification flow:

```bash
npm run test:new-post
npm run test:writing
npm run test:site
npm run test:manifest
npm run test:manifest-diagnostics
npm run test:version
npm run test:runtime
npm run test:install-smoke
```

---

# Dependency Policy

Current dependency shape:

```txt
runtime dependencies: 0
dev dependencies:
- typescript
- @types/node
```

This is intentional.

Paideia favors:

* simple infrastructure
* inspectable systems
* small trusted surfaces
* readable generated output

---

# Runtime Philosophy

Paideia applications should remain:

* small
* understandable
* inspectable
* operationally explicit
* token-efficient
* secure by default
* boring in production

---

# Current Status

Paideia is still early.

It is not yet:

* a full application platform
* a production database runtime
* a hosted deployment platform
* a production auth system
* a general-purpose frontend framework competitor

But it is now capable of powering a real minimal website and structured writing system with a self-describing runtime identity layer.

That is an important threshold.

---

# Roadmap

## v1.4

Manifest-first runtime foundation

## v1.5

Website runtime foundation

## v1.6

Authoring ergonomics foundation

## v1.7

Runtime identity foundation

## v2

Useful small websites and applications

Long-term direction:

```txt
explicit contracts
→ inspectable runtime
→ human-readable software
→ agent-readable software
```

---

# Release History

## v1.1

Production runtime foundation

## v1.3

Explicit action/runtime contracts

## v1.4

Manifest-first runtime contracts

## v1.5

Website runtime foundation

## v1.6

Authoring ergonomics foundation

## v1.7

Runtime identity foundation

---

# License

MIT
