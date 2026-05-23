# agentify viewer

Static visual viewer for an agentify artifact bundle.

Run locally:

```bash
cd examples
python3 -m http.server 4177
```

Then open:

```txt
http://127.0.0.1:4177/agentify-viewer/
```

The viewer can switch between:

```txt
agentify-output/static-site/
agentify-output/docs-site/
agentify-output/js-heavy-spa/
```

It renders crawl status, routes, failures, capabilities, and artifact previews without React or a build step.
