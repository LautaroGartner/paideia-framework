# Paideia Framework

Inspectable AI-native application runtime framework.

Describe the system. Generate the software. Keep it understandable.

Paideia is an inspectable AI-native runtime for generated systems.

Status: `v1.3.0-alpha.5`

Paideia is an AI-native application runtime focused on inspectability, operational clarity, and secure defaults.

It is not another frontend framework. Paideia starts from a resource declaration and generates a small application foundation around it: UI, validation, local persistence, permissions, actions, AI capabilities, SQL schema, runtime events, and a system manifest that explains what was generated. It then runs those artifacts through a small production runtime with health checks, diagnostics, logs, lifecycle behavior, and secure defaults.

> Describe the system. Generate the software. Keep it understandable.

> Standardized by default. Customizable without breaking.

## Screenshots

| Generated runtime | Development CLI |
| --- | --- |
| ![Generated runtime](screenshots/runtime.png) | ![Development CLI](screenshots/cli.png) |

| Development inspect panel | Manifest contract |
| --- | --- |
| ![Development inspect panel](screenshots/inspect-panel.png) | ![Manifest contract](screenshots/manifest.png) |

| Accessibility report |
| --- |
| ![Accessibility report](screenshots/a11y.png) |

The CLI and inspect-panel screenshots show development tooling. In production, Paideia exposes only the generated app and the safe `/__paideia/health` endpoint.

## What This Is / Is Not

Paideia is:

- a small operational runtime for generated applications
- a demo of generated software with a trust model
- a small framework architecture for resource-driven systems
- an experiment in making generated systems understandable to humans and AI tools

Paideia is not yet:

- a real authentication system
- a production database layer
- a production backend route framework
- a hosted platform
- a real AI provider integration
- a package ecosystem

The current demo proves the direction: describe a system once and get a generated, inspectable, secure-by-default foundation.

## Current Limitations

Paideia is still early and intentionally small. The v1.1 production runtime is usable for previewing generated artifacts, but many application-platform features are not implemented yet.

Current runtime limitations include:

- browser-local persistence only
- no real authentication or session runtime
- no production database adapters yet
- simulated AI runtime behavior
- manifested API routes, but no production backend route runtime yet
- no deployment adapters yet

## Demo Story

The included demo is a lead intake system.

It shows how one resource declaration can produce a working generated runtime:

1. Create a lead.
2. Trigger validation when required fields are missing or invalid.
3. Mark the lead as contacted with a declared update action.
4. Try to summarize the lead as the public user.
5. Watch the AI action get blocked by permissions.
6. Inspect the browser log, development CLI event stream, manifest, schema, and runtime API to understand why.

The point is not that Paideia has a form. The point is that the generated system can explain itself.

## What Paideia Generates

From a resource declaration, Paideia generates:

- `dist/index.html`: a browser runtime for creating, validating, storing, and acting on records
- `dist/schema.sql`: a SQL schema for the resource
- `dist/system.json`: a manifest describing the generated system contract

The generated runtime currently targets the browser and uses `localStorage` for persistence. Runtime dependencies are intentionally zero.

## Ports

Paideia uses separate default ports for development and production:

```txt
development: 4317
production: 3000
```

The split is intentional. Development uses a Paideia-specific port for the live dev runtime, inspector routes, browser-to-CLI event bridge, and interactive tooling. Production uses the conventional app server port and only exposes generated artifacts plus the safe health endpoint.

Both runtimes use the same override:

```bash
PAIDEIA_PORT=4000 paideia dev
PAIDEIA_PORT=4000 paideia start
```

## Runtime Modes

Paideia recognizes an explicit runtime mode contract:

```txt
development
production
```

The CLI wires modes into lifecycle commands: `paideia dev` runs with `development`, and `paideia start` runs with `production`. Invalid `PAIDEIA_MODE` values fall back to `production` so malformed environment configuration does not expose development behavior by accident.

## Production Runtime

Build production artifacts:

```bash
paideia build
```

Start the production runtime with the CLI:

```bash
paideia start
```

Or from a repository checkout:

```bash
node cli.mjs start
```

Or through npm:

```bash
npm run start
```

Default production port:

```txt
3000
```

Custom port:

```bash
PAIDEIA_PORT=4000 paideia start
```

The production runtime serves generated files from `dist/` and deliberately excludes development tooling such as the inspector API and browser-to-CLI bridge.

It provides:

- deterministic artifact serving from `dist/`
- lifecycle logs for boot, ready, shutdown, and fatal errors
- graceful shutdown on `SIGINT` and `SIGTERM`
- `GET` and `HEAD` only
- hardened path containment for generated artifacts
- malformed URL handling
- explicit MIME types
- generic 404 responses
- method restrictions before health handling
- security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`

### Health Endpoint

The production runtime exposes one intentional operational endpoint:

```txt
GET /__paideia/health
```

Example response:

```json
{
  "status": "ok",
  "framework": "paideia",
  "version": "1.3.0-alpha.5",
  "runtime": "production",
  "dist": "ready"
}
```

This endpoint exposes only safe operational metadata. It does not expose filesystem paths, environment variables, stack traces, schema contents, generated app internals, or runtime adapters.

Other internal runtime routes, such as `/__paideia/runtime`, remain hidden in production.

## Diagnostics

Run runtime diagnostics:

```bash
paideia doctor
```

Or from a repository checkout:

```bash
node cli.mjs doctor
```

Or:

```bash
npm run doctor
```

`doctor` validates:

- `dist/` exists
- `dist/index.html` exists
- `dist/system.json` exists and is valid JSON
- `dist/schema.sql` exists, is non-empty, and includes `CREATE TABLE`
- `.paideia/logs/runtime.log` is readable when present
- `.paideia/logs/crash.log` is readable when present

When diagnostics fail, doctor prints the likely next action. It also ends with a compact summary of passed, failed, and skipped checks.

## Runtime State

Paideia writes local runtime state under:

```txt
.paideia/
```

Current structure:

```txt
.paideia/
  logs/
    runtime.log
    crash.log
```

`runtime.log` is append-only operational history. It records lifecycle events, rejected methods, 404 requests, startup validation failures, and mirrored crash entries.

`crash.log` is append-only fatal incident history. It records uncaught exceptions and unhandled rejections.

`.paideia/` is local runtime state and should not be committed.

## CLI

The CLI lifecycle is now frozen for v1.2:

```bash
paideia dev
paideia build
paideia manifest
paideia schema
paideia explain
paideia doctor
paideia start
paideia --version
paideia --help
```

`manifest` prints the machine-readable generated contract from `dist/system.json`. `schema` prints the generated SQL shape from `dist/schema.sql`. `explain` prints a Markdown summary of the generated system from the manifest.

The package also declares:

```json
{
  "bin": {
    "paideia": "./cli.mjs"
  }
}
```

The npm scripts delegate to the same CLI commands, so repository checkouts and installed usage follow one lifecycle path.

## Resource Model

Resources describe the shape and behavior of the system:

```ts
const leadResource = resource(
  "Lead",
  {
    name: string("Name").required().min(2),
    email: email("Email").required(),
    status: select(["new", "contacted", "closed"], "Status").required(),
    notes: string("Notes"),
  },
  {
    storage: "local",
    permissions: {
      create: "public",
      update: "public",
      delete: "admin",
      ai: "authenticated",
    },
    actions: [
      ai.summarizeRecord({
        name: "summarize",
        label: "Summarize",
      }),
    ],
  }
);
```

A resource can declare:

- fields and validation rules
- local storage behavior
- permission requirements
- update actions
- explicit AI actions
- runtime target

## Manifest Contract

`dist/system.json` is the contract of the generated system. It includes:

- framework name, version, and mode
- resource fields, actions, and permissions
- runtime target, persistence, composition, events, and developer tooling
- capabilities for storage, runtime, records, actions, and AI
- API route contracts
- AI guarantees and declared actions
- trust guarantees

This manifest is designed for humans, AI tools, editors, and future automation.

## Runtime Events

The browser runtime emits named events:

```txt
record.created
record.deleted
records.cleared
validation.failed
action.executed
ai.executed
permission.denied
```

In development, these events are visible in the generated framework log and are bridged to the CLI through the dev server:

```txt
[12:44:10 PM] Browser record.created
```

Production builds omit the browser-to-CLI bridge.

Action events are structured runtime contracts. A generated action declares its success and denied event names in `dist/system.json`, `paideia explain` displays them, and `paideia doctor` validates them. Runtime payloads include action metadata, resource metadata, permission context, effect details, and timestamps.

## Permissions

Paideia permissions are explicit and manifested:

```txt
public
authenticated
admin
```

The generated browser runtime enforces declared permissions for creation, update actions, deletion, and AI actions. The manifest records those requirements so the generated system can be inspected instead of guessed.

## Capabilities

Capabilities describe what the generated system can do:

- `storage.local`
- `runtime.browser`
- `record.read`
- `record.create`
- `record.update`
- `record.delete`
- `ai.summarizeRecord`

Capabilities are derived from the resource and actions, then written to `system.json`.

## AI Philosophy

Paideia is AI-native, not AI-chaotic.

AI behavior must be:

- explicitly declared
- visible in the generated UI only when declared
- represented in the manifest
- auditable through logs and runtime events in development
- blocked by permissions when required

AI must not silently mutate state.

## Development Runtime

Start the live development runtime:

```bash
paideia dev
```

Default port:

```txt
4317
```

Custom port:

```bash
PAIDEIA_PORT=4000 paideia dev
```

The dev runtime provides:

- file watching
- rebuilds
- local HTTP serving
- browser-to-CLI event bridge
- interactive CLI commands
- runtime inspector API
- accessibility report

Interactive commands:

```txt
help
open
runtime
manifest
schema
events
a11y
clear
exit
```

## Walkthrough

Run the development server:

```bash
paideia dev
```

Or choose a custom port:

```bash
PAIDEIA_PORT=4000 paideia dev
```

Then:

1. Open `http://localhost:4317` or the custom port you chose.
2. Create a Lead and watch the CLI receive `Browser record.created`.
3. Try the restricted AI summary action as the public user and watch `permission.denied`.
4. Open the generated inspect panel in the page.
5. Visit `http://localhost:4317/__paideia/runtime` to inspect the runtime API.
6. Run `manifest` in the CLI to print `dist/system.json`.
7. Run `schema` in the CLI to print `dist/schema.sql`.
8. Run `a11y` in the CLI to check accessibility.
9. Run `paideia build`.
10. Verify production output strips dev tooling:

```bash
grep -n "inspect-panel\\|framework-log\\|__paideia\\|runtime inspector" dist/index.html
```

Production should return no matches.

## Runtime Inspector API

The dev server exposes generated system state over HTTP:

```txt
GET /__paideia/runtime
GET /__paideia/manifest
GET /__paideia/schema
GET /__paideia/events
GET /__paideia/accessibility
```

These endpoints are development tooling. They are not part of production output.

## Accessibility

The CLI accessibility report checks generated HTML for:

- labels
- required field indicators
- `aria-invalid` support
- field-level errors
- validation summary
- table headers
- readable buttons
- identifiable generated sections

Run it in development:

```txt
a11y
```

## Environment-Aware Generation

Development builds include:

- inspect panel
- framework log
- runtime diagnostics
- browser-to-CLI event bridge
- runtime inspector API through the dev server

Production builds strip:

- inspect panel
- framework log
- browser-to-CLI bridge code
- dev-server inspector endpoints
- runtime diagnostics UI

This is a core Paideia principle: generated systems should adapt to their environment without changing the resource declaration.

## Dependency Policy

Current dependency shape:

```txt
runtime dependencies: 0
dev dependencies:
- typescript
- @types/node
```

This is intentional. Paideia favors simple infrastructure, small trusted surfaces, and inspectable generated output.

## Runtime Philosophy

Paideia's runtime should stay:

- small
- inspectable
- operationally explicit
- secure by default
- boring in production

The runtime favors native Node modules, explicit files, structured logs, and stable contracts over middleware stacks or hidden magic.

## Core Principles

- Simple infrastructure
- Visible runtime
- AI-native but not AI-chaotic
- Secure and privacy-first
- Inspectable generated systems
- Minimal dependencies
- Standardized but customizable

## Roadmap

Future work should extend the same trust model instead of burying it:

- v1.1: production runtime, diagnostics, structured logs, health, and CLI surface
- v1.1.1: runtime and CLI hardening patch
- v1.2.0-alpha.1: full CLI lifecycle with `paideia dev`, `paideia build`, `paideia doctor`, and `paideia start`
- v1.2.0-alpha.2: explicit runtime mode contract with safe fallback to production
- v1.2.0-alpha.3: CLI-owned mode wiring for development and production commands
- v1.2.0-beta.1: coherent CLI toolchain with build, inspection, explanation, diagnostics, and runtime commands
- v1.2.0-rc.1: release-candidate hardening for the frozen CLI lifecycle
- v1.2.0: Paideia becomes a coherent CLI toolchain
- v1.3.0-alpha.1: action contracts are explicit in the generated manifest
- v1.3.0-alpha.2: doctor validates generated action contracts
- v1.3.0-alpha.3: community health files reinforce contribution and security expectations
- v1.3.0-alpha.4: runtime actions emit structured, inspectable events
- v1.3.0-alpha.5: doctor validates generated action event contracts
- v1.3: runtime contracts, actions, and capability clarity
- v1.4: real auth and session boundaries
- v1.5: working API routes from the manifested API contract
- v1.6: AI provider adapters with audit logs
- v2: deeper runtime, compiler, and language direction

## License

MIT
