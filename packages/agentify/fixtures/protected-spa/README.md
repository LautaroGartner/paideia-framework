# Protected SPA Fixture

This fixture captures a real-world protected single-page application surface.

It demonstrates an important protocol distinction:

```txt
Transport success is not the same as machine readability.
```

The crawl fetched routes successfully and produced a valid artifact bundle, while still preserving semantic warnings:

* `missing.title`
* `missing.description`
* `js.required`

This means the site was reachable, but its static content was not meaningfully observable. The fixture is useful because it records transport success alongside machine-readability limits instead of collapsing both into a plain success or failure state.
