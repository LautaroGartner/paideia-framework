# Agent-readable web notes

Working thesis:

```txt
llms.txt is useful, but not enough.
Agents need routes, artifacts, capabilities, diagnostics, and runtime identity.
```

## Problem

Most websites expose pages for people and markup for browsers, but very little about the system behind those pages.

An agent can fetch a URL, read the visible text, follow links, and infer structure. That works for simple browsing, but it gets brittle when the agent needs to answer operational questions:

* What routes exist?
* Which files were generated?
* What is static and what is runtime behavior?
* What capabilities does the system claim?
* Were the generated contracts validated?
* Which artifacts should an agent read first?

`llms.txt` gives agents a good entrypoint. It does not, by itself, describe the full generated system.

## Shape

An agent-readable site should publish a small explanation layer next to the human site:

```txt
dist/
  system.json
  runtime.json
  context.json
  llms.txt
  robots.txt
  sitemap.xml
```

`system.json` describes the generated system contract.

`runtime.json` records framework version, build identity, artifact inventory, capabilities, and diagnostics.

`context.json` gives agents a compact map of pages, posts, and important runtime facts.

`llms.txt` gives a plain-language starting point.

## Principle

The goal is not to make every website self-documenting in a huge way.

The goal is to make generated websites say enough about themselves that a person or agent can inspect the output before trusting it.

Useful explanation files should be:

* small
* generated
* deterministic where possible
* easy to validate
* readable without framework internals
* concrete about routes, artifacts, capabilities, and diagnostics

## Paideia angle

Paideia is already testing this shape on its own generated site.

The current release produces:

* `system.json`
* `runtime.json`
* `context.json`
* `llms.txt`
* `robots.txt`
* `sitemap.xml`
* `paideia doctor`
* `paideia inspect`

That is enough to make the idea real, but not enough to make it portable to arbitrary websites.

The next question is whether this explanation layer can be generated for any existing site.
