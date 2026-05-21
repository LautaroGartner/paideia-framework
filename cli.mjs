#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import { createRuntimeConfig } from "./runtime/config.mjs";

const config = createRuntimeConfig();
const command = process.argv[2];
const args = process.argv.slice(3);
const CLI_DIR = path.dirname(fileURLToPath(import.meta.url));

function resolveScript(scriptPath) {
  return path.join(CLI_DIR, scriptPath);
}

function printHelp() {
  console.log("Paideia CLI");
  console.log("");
  console.log("Usage:");
  console.log("  paideia <command>");
  console.log("");
  console.log("Commands:");
  console.log("  paideia dev      Start the development runtime");
  console.log("  paideia init     Create a new Paideia project");
  console.log("  paideia build    Build production artifacts");
  console.log("  paideia start    Start the production runtime");
  console.log("  paideia doctor   Run runtime diagnostics");
  console.log("  paideia inspect  Print runtime identity summary");
  console.log("  paideia new post Create a writing post contract");
  console.log("  paideia manifest Print generated system manifest");
  console.log("  paideia schema   Print generated SQL schema");
  console.log("  paideia explain  Explain generated system as Markdown");
  console.log("");
  console.log("Options:");
  console.log("  --help      Show help");
  console.log("  --version   Show version");
}

const commands = {
  dev: {
    bin: "node",
    args: [resolveScript("scripts/dev.mjs")],
    env: {
      PAIDEIA_MODE: "development",
    },
  },
  init: {
    bin: "node",
    args: [resolveScript("scripts/init.mjs"), ...args],
  },
  build: {
    bin: "node",
    args: [resolveScript("scripts/build.mjs")],
  },
  start: {
    bin: "node",
    args: [resolveScript("scripts/start.mjs")],
    env: {
      PAIDEIA_MODE: "production",
    },
  },
  doctor: {
    bin: "node",
    args: [resolveScript("scripts/doctor.mjs")],
  },
  inspect: {
    bin: "node",
    args: [resolveScript("scripts/inspect.mjs")],
  },
  manifest: {
    bin: "node",
    args: [resolveScript("scripts/manifest.mjs")],
  },
  schema: {
    bin: "node",
    args: [resolveScript("scripts/schema.mjs")],
  },
  explain: {
    bin: "node",
    args: [resolveScript("scripts/explain.mjs")],
  },
};

if (command === "new") {
  const type = args[0];
  const title = args.slice(1).join(" ");

  if (type !== "post" || !title.trim()) {
    console.error("[paideia] usage: paideia new post \"Post title\"");
    process.exit(1);
  }

  commands.new = {
    bin: "node",
    args: [
      resolveScript("scripts/new-post.mjs"),
      title,
    ],
  };
}

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log(config.version);
  process.exit(0);
}

if (!commands[command]) {
  console.error(`[paideia] unknown command: ${command}`);
  console.error("");
  printHelp();
  process.exit(1);
}

const selected = commands[command];

const child = spawn(selected.bin, selected.args, {
  stdio: "inherit",
  env: {
    ...process.env,
    ...(selected.env ?? {}),
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
