# Lead Intake System

This is the first Paideia demo scenario: a small lead intake system whose generated runtime remains inspectable.

The resource declaration in `src/index.ts` defines:

- fields: name, email, status, notes
- local browser persistence
- public create/update permissions
- admin-only deletion
- authenticated-only AI summary
- declared update actions
- an explicit AI action

Run the live development runtime from the repo root:

```bash
paideia dev
```

Then open the local URL, create a lead, try the restricted AI summary, and inspect the browser log, CLI events, `dist/system.json`, `dist/schema.sql`, and the development-only `/__paideia/runtime` endpoint.

Build production artifacts:

```bash
paideia build
```

Run diagnostics:

```bash
paideia doctor
```

Start the production runtime:

```bash
paideia start
```

In production, Paideia intentionally does not expose `/__paideia/runtime`. The safe operational endpoint is:

```txt
GET /__paideia/health
```

That endpoint returns status, framework, version, runtime mode, and artifact readiness without exposing filesystem paths, environment variables, stack traces, schema contents, or generated app internals.
