import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { packageRoot } from "./project.mjs";

function slugifyPackageName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleizeProjectName(value) {
  const words = value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "My Site";
  }

  return words
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function writeFile(projectRoot, relativePath, contents) {
  const outputPath = path.join(projectRoot, relativePath);

  fs.mkdirSync(path.dirname(outputPath), {
    recursive: true,
  });

  fs.writeFileSync(outputPath, contents);
}

function isDirectoryEmpty(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return true;
  }

  return fs.readdirSync(targetPath).length === 0;
}

const projectName = process.argv[2]?.trim();

if (!projectName) {
  console.error("[paideia] project name is required");
  console.error("[paideia] usage: paideia init <project-name>");
  process.exit(1);
}

const projectRoot = path.resolve(process.cwd(), projectName);

if (fs.existsSync(projectRoot) && !isDirectoryEmpty(projectRoot)) {
  console.error(
    `[paideia] target directory is not empty: ${projectName}`
  );
  process.exit(1);
}

const packageName =
  slugifyPackageName(path.basename(projectRoot)) || "paideia-site";
const siteTitle = titleizeProjectName(path.basename(projectRoot));

fs.mkdirSync(projectRoot, {
  recursive: true,
});

writeFile(
  projectRoot,
  "package.json",
  `${JSON.stringify(
    {
      name: packageName,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        build: "paideia build",
        start: "paideia start",
        doctor: "paideia doctor",
        inspect: "paideia inspect",
        "new:post": "paideia new post",
      },
      dependencies: {
        "paideia-framework": `file:${packageRoot}`,
      },
      devDependencies: {
        "@types/node": "^25.7.0",
        typescript: "^5.9.3",
      },
    },
    null,
    2
  )}\n`
);

writeFile(
  projectRoot,
  "tsconfig.json",
  `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM"],
        module: "Node16",
        moduleResolution: "Node16",
        rootDir: "src",
        outDir: "build",
        strict: true,
        esModuleInterop: true,
        types: ["node"],
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      include: ["src"],
    },
    null,
    2
  )}\n`
);

writeFile(
  projectRoot,
  "README.md",
  `# ${siteTitle}

Generated with Paideia Framework.

## Run locally

\`\`\`bash
npm install
npm run build
npm run start
\`\`\`

Then open:

\`\`\`txt
http://localhost:3000
\`\`\`

## Create a post

\`\`\`bash
npm run new:post -- "My Post"
\`\`\`

Posts live in \`src/writing/\`.

## Inspect the runtime

\`\`\`bash
npm run inspect
npm run doctor
\`\`\`

## Generated artifacts

\`\`\`txt
dist/
  index.html
  runtime.json
  system.json
  context.json
  llms.txt
\`\`\`

## Deploy

Deploy the generated \`dist/\` directory to any static host.
`
);

writeFile(
  projectRoot,
  "src/site.ts",
  `import { posts } from "./writing/index.js";

export const site = {
  title: "${siteTitle}",
  description: "A small site generated with Paideia.",
  author: "Your Name",
  url: "https://example.com",
  language: "en",
  posts,
  pages: [
    {
      path: "/",
      title: "Home",
      description: "A small generated homepage.",
      body: "Welcome to ${siteTitle}. Edit src/site.ts to make this site your own.",
      nav: false,
      tokenSummary: "Homepage for ${siteTitle}.",
    },
    {
      path: "/about",
      title: "About",
      description: "About ${siteTitle}.",
      body: "This is a small site generated with Paideia. It publishes both pages and machine-readable runtime artifacts.",
      nav: true,
      tokenSummary: "About page for ${siteTitle}.",
    },
  ],
};
`
);

writeFile(
  projectRoot,
  "src/writing/first-post.ts",
  `export const post = {
  slug: "first-post",
  title: "My First Paideia Post",
  description: "A first post in a freshly initialized Paideia site.",
  publishedAt: "2026-05-21",
  body: \`
This is the first post in your Paideia site.

Edit this file in src/writing/first-post.ts, then rebuild.
\`,
  tokenSummary: "Starter post for a newly initialized Paideia site.",
};
`
);

writeFile(
  projectRoot,
  "src/writing/index.ts",
  `import { post as firstPost } from "./first-post.js";

export const posts = [
  firstPost,
];
`
);

console.log(`[paideia] initialized ${projectName}`);
console.log("");
console.log("Next steps:");
console.log(`  cd ${projectName}`);
console.log("  npm install");
console.log("  npm run build");
console.log("  npm run start");
