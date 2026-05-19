import fs from "node:fs";
import path from "node:path";

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function template({ slug, title }) {
  return `export const post = {
  slug: "${slug}",
  title: "${escapeString(title)}",
  description: "",
  publishedAt: "${today()}",
  body: \`
Write here.
\`,
  tokenSummary: "",
};
`;
}

const title = process.argv.slice(2).join(" ").trim();

if (!title) {
  console.error("[paideia] post title is required");
  process.exit(1);
}

const slug = slugify(title);

if (!slug) {
  console.error("[paideia] post title must contain letters or numbers");
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "src", "writing");
const outputPath = path.join(outputDir, `${slug}.ts`);

fs.mkdirSync(outputDir, { recursive: true });

if (fs.existsSync(outputPath)) {
  console.error(`[paideia] post already exists: src/writing/${slug}.ts`);
  process.exit(1);
}

fs.writeFileSync(outputPath, template({ slug, title }));

console.log(`[paideia] created src/writing/${slug}.ts`);
