export const post = {
  slug: "getting-started",
  title: "Getting Started",
  topics: [
    "docs",
    "quickstart",
  ],
  description:
    "How to install, build, run, and inspect the Paideia docs example.",
  publishedAt: "2026-05-21",
  body: `
This docs example is a small standalone Paideia project.

Install dependencies:

\`\`\`bash
npm install
\`\`\`

Build the generated site:

\`\`\`bash
npm run build
\`\`\`

Start the production runtime:

\`\`\`bash
npm run start
\`\`\`

Inspect the runtime:

\`\`\`bash
npm run inspect
npm run doctor
\`\`\`

The build output lives in dist and includes both human-facing pages and machine-readable runtime artifacts.
`,
  tokenSummary:
    "Getting started docs page for installing, building, running, and inspecting the Paideia docs example.",
};
