export const post = {
  slug: "runtime-artifacts",
  title: "Runtime Artifacts",
  topics: [
    "docs",
    "runtime identity",
    "artifacts",
  ],
  description:
    "The generated files Paideia emits so humans and agents can inspect the docs site.",
  publishedAt: "2026-05-21",
  body: `
Paideia generates runtime artifacts beside the site pages.

\`\`\`txt
dist/
  index.html
  about/index.html
  getting-started/index.html
  runtime-artifacts/index.html
  runtime.json
  system.json
  context.json
  llms.txt
\`\`\`

system.json describes the generated system contract.

runtime.json describes the runtime identity, build metadata, generated artifact inventory, and declared capabilities.

context.json gives humans and agents a compact summary of pages, writing entries, and runtime facts.

llms.txt is a plain-language entrypoint for agents that need to understand the generated system.
`,
  tokenSummary:
    "Runtime artifacts docs page explaining system.json, runtime.json, context.json, and llms.txt for the Paideia docs example.",
};
