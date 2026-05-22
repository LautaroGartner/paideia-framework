# agentify viewer

Static visual viewer for an agentify artifact bundle.

Run locally:

```bash
cd examples/agentify-viewer
python3 -m http.server 4177
```

Then open:

```txt
http://127.0.0.1:4177/
```

The viewer loads:

```txt
demo/
  runtime.json
  system.json
  context.json
  llms.txt
```

It renders crawl status, routes, failures, capabilities, and artifact previews without React or a build step.
