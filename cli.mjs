#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import { createRuntimeConfig } from "./runtime/config.mjs";

const config = createRuntimeConfig();
const command = process.argv[2];
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
  console.log("  paideia build    Build production artifacts");
  console.log("  paideia start    Start the production runtime");
  console.log("  paideia doctor   Run runtime diagnostics");
  console.log("");
  console.log("Options:");
  console.log("  --help      Show help");
  console.log("  --version   Show version");
}

const commands = {
  dev: ["node", [resolveScript("scripts/dev.mjs")]],
  build: ["node", [resolveScript("scripts/build.mjs")]],
  start: ["node", [resolveScript("scripts/start.mjs")]],
  doctor: ["node", [resolveScript("scripts/doctor.mjs")]],
};

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

const [bin, args] = commands[command];

const child = spawn(bin, args, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
