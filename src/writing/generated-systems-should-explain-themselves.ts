export const post = {
  slug: "generated-systems-should-explain-themselves",
  title: "Why Generated Systems Should Explain Themselves",
  topics: [
    "runtime identity",
    "generated systems",
    "agents",
  ],
  description:
    "Why generated software should expose its shape, contracts, capabilities, and security-relevant runtime facts.",
  publishedAt: "2026-05-20",
  body: `
Generated software has a trust problem, not because generation is bad. Generation is useful. It saves time, removes repetition, and lets a framework create consistent output. The problem is what happens after generation. A build runs, a folder appears, and the developer is expected to trust that the output is correct, safe, and understandable. That is too much trust.

A generated system should explain itself.

It should say what it produced, what kind of files exist, what capabilities are present, which build produced the output, and whether its contracts are valid. This is not just a developer-experience feature. It is also a security feature.

Security starts with knowing what exists. If a runtime cannot list its own artifacts, you have to discover them manually. If it cannot say what capabilities it has, you have to infer behavior from code and conventions. If it cannot tell you whether its manifest is valid, you do not know whether the system you are inspecting matches the system the framework thinks it generated. That uncertainty becomes operational risk.

Paideia tries to reduce that risk with small, explicit files.

system.json describes the generated system contract. runtime.json describes the runtime identity: framework version, build ID, artifact inventory, declared capabilities, and build metadata. context.json gives agents a compact map of the site. llms.txt explains where agents should start. The doctor command validates that the generated runtime is internally consistent.

This matters for security because hidden behavior is hard to review. A simple artifact inventory can tell you whether the output contains only the files you expect. A deterministic build ID can tell you whether content changed between builds. Capability declarations can tell you what the runtime claims it can do: serve a static site, expose agent context, validate manifests, inspect runtime identity. Doctor checks can catch broken contracts before you ship. None of this replaces real security review, but it gives the review something concrete to start from.

The important part is that these files are boring. They are not a new permission system. They are not a cloud dependency. They are not a complex policy engine. They are plain generated outputs that can be read by humans, checked by scripts, and handed to agents. That is enough to make the system easier to inspect.

Developers already do this kind of work informally. We check folders. We skim build output. We open generated files. We ask whether the runtime is serving more than it should. We wonder whether a change came from content or from tooling. Paideia makes some of those questions first-class.

That shift is small, but it changes the default posture. Instead of asking developers to reverse-engineer the generated system, the system gives them a map. Instead of hiding runtime behavior behind framework confidence, the runtime declares its capabilities. Instead of treating generated output as a side effect, the framework treats it as something that should be described and verified.

This also helps agents. An agent working on a codebase should not have to guess which files matter. It should not have to invent capabilities from folder names. It should not have to summarize an entire site from scratch if the system already has a compact context file. The same explicit surfaces that help security review also help automated tools behave more carefully.

That is the basic idea: make the generated system legible enough that humans and agents can inspect it before they trust it.

Readable software is not only code with nice formatting. It is software whose shape can be discovered, whose output can be checked, and whose behavior is declared plainly.

Generated systems should explain themselves because understanding is part of safety.
`,
  tokenSummary:
    "Developer-facing essay explaining why generated systems should expose runtime identity, artifact inventories, capabilities, diagnostics, and security-relevant facts.",
};
