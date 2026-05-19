# Paideia Framework

Inspectable website and application runtime framework.

Build software that humans and agents can understand.

Current version: `v1.6.0`
Authoring ergonomics foundation

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

`v1.6.0` can currently generate and serve:

* static pages
* structured writing collections
* individual post pages
* generated navigation
* `404.html`
* `system.json`
* `context.json`
* `llms.txt`
* runtime diagnostics
* writing validation
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
  writing/index.html
  writing/<post>/index.html
  404.html
  system.json
  context.json
  llms.txt
```

## `system.json`

Machine-readable runtime contract.

Includes:

* framework metadata
* site metadata
* pages
* writing metadata
* runtime capabilities
* generation structure

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
paideia new post "Post title"
paideia --version
paideia --help
```

## Commands

### `paideia build`

Generates website artifacts into `dist/`.

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
  "version": "1.6.0",
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
* `context.json`
* writing runtime structure
* generated pages
* generated post pages
* runtime logs
* writing validation
* manifest validation

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

But it is now capable of powering a real minimal website and structured writing system.

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

Content format and writing ergonomics

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

---

# License

MIT
