export const post = {
  slug: "generated-systems-should-explain-themselves",
  title: "Why Generated Systems Should Explain Themselves",
  description:
    "A note on readable software, explicit runtime identity, and why generated systems should be able to describe what they made.",
  publishedAt: "2026-05-20",
  body: `
Most generated software asks for trust before it offers understanding.

It creates files, hides decisions behind framework conventions, and then leaves the developer to reverse-engineer the shape of the system from folders, defaults, and build output. That is convenient when everything works. It becomes expensive the moment a human, a teammate, an operator, or an agent needs to answer a simple question: what is this system?

Paideia is built around a different premise.

A generated system should be able to explain itself. It should say what it produced, what each artifact is for, what capabilities are present, whether the runtime is valid, and which build produced the current output. Not as a decorative dashboard. Not as an enterprise metadata layer. As a small, inspectable contract that lives beside the generated application.

That is the reason Paideia emits system.json, context.json, llms.txt, and runtime.json. Each file has a narrow job. The system contract describes the generated site. The context map compresses the runtime for agents. The guide tells language models where to start. The runtime identity records the build, artifact inventory, capabilities, and deterministic fingerprint.

This is not about making software more complicated. It is about reducing archaeology.

Modern tools often optimize for speed by making structure implicit. Paideia optimizes for legibility by making structure explicit. The tradeoff is intentional. A small generated site should not require a large mental model. It should be possible to inspect the output and understand the system without asking the framework to narrate itself from memory.

This matters more as agents become part of the software loop. Agents do not need mystical interfaces. They need stable, boring, explicit surfaces. They need to know which files exist, what kind of artifacts they are, what contracts are valid, and what capabilities the runtime claims. The same information helps humans too.

Readable software is not only code that looks nice. It is software whose shape can be discovered, verified, and explained.

That is the direction Paideia is taking: small systems that carry their own identity, keep their contracts close to their output, and remain understandable after generation.
`,
  tokenSummary:
    "Positioning essay arguing that generated systems should expose explicit runtime identity, artifact inventories, capabilities, diagnostics, and agent-readable context.",
};
