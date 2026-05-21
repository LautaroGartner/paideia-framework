import { posts } from "./writing/index.js";

export const site = {
  title: "Paideia Docs Example",
  description: "A small generated documentation site built with Paideia.",
  author: "Paideia Docs Example",
  url: "https://example.com",
  language: "en",
  posts,
  pages: [
    {
      path: "/",
      title: "Paideia Docs Example",
      description:
        "A small generated documentation site built with Paideia.",
      body: `
Paideia Docs Example

A small generated documentation site built with Paideia.

This example treats docs pages as structured writing. It keeps the surface small while proving Paideia can generate a documentation-shaped system with multiple routes, generated navigation, and runtime artifacts.
`,
      nav: false,
      tokenSummary:
        "Homepage for a small Paideia documentation example.",
    },
    {
      path: "/about",
      title: "About",
      description: "About the Paideia docs example.",
      body: `
This docs example exists to prove Paideia can generate more than a blog.

It uses the same small runtime and artifact surfaces as the main site, but the information architecture is documentation-shaped: a homepage, docs entries, generated routes, runtime inspection, and diagnostic checks.
`,
      nav: true,
      tokenSummary:
        "About page explaining the purpose of the Paideia docs example.",
    },
  ],
};
