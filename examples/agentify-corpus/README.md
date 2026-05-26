# Agentify Crawl Corpus

Small real-world crawl bundles captured with `agentify`.

These examples are not canonical protocol fixtures. They are operational samples from live sites that exercise the kinds of ambiguity Agentify needs to preserve: protection, JavaScript shells, missing metadata, unavailable discovery files, redirects, and auth walls.

Each corpus entry contains:

```txt
system.json
runtime.json
context.json
llms.txt
```

Corpus-level classification lives in `corpus.json`. It records coarse machine-readability judgments beside validation expectations without adding new protocol fields to the runtime receipts.

The key corpus distinction is that transport success and machine readability are separate. A site can return pages and still be only partially understandable to a static crawler because meaningful state requires JavaScript, authentication, complete metadata, or cleaner discovery files.

## Entries

* `good-static-site/`: `https://www.iana.org/domains/reserved`, a stable public HTML site with multiple fetched routes and missing-description warnings.
* `protected-site/`: `https://app.asana.com/`, a protected application surface that returned HTTP 403.
* `js-heavy-spa/`: `https://app.slack.com/`, a JavaScript-required application shell.
* `malformed-metadata/`: `http://info.cern.ch/`, an old public site with sparse metadata.
* `broken-or-missing-sitemap/`: `https://example.com/`, a simple public page with unavailable sitemap and robots discovery.
* `redirect-loop-or-depth/`: `https://httpbin.org/redirect/50`, a redirect-depth failure captured as a failed route.
* `auth-wall/`: `https://github.com/settings/profile`, an authenticated route that redirects into login/signup flows.

## Capture Command

The corpus was captured with the package CLI and a corpus-specific user agent:

```bash
node packages/agentify/bin/agentify.mjs <url> \
  --out examples/agentify-corpus/<entry> \
  --max-pages 5 \
  --delay-ms 500 \
  --retries 1 \
  --user-agent "agentify/0.7 corpus"
```

Use these bundles for:

* benchmark examples
* demos
* regression tests
* essays and protocol notes
* future CI-mode design

Validate the checked-in corpus from the repository root:

```bash
npm run test:agentify-corpus
```
