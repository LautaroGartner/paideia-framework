#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { main as runAgentify } from "../packages/agentify/bin/agentify.mjs";

export {
  AGENTIFY_VERSION,
  agentify,
  explainAgentify,
  inspectAgentify,
  main,
  validateAgentify,
} from "../packages/agentify/bin/agentify.mjs";

const isCli = process.argv[1]
  ? fs.realpathSync(fileURLToPath(import.meta.url)) ===
      fs.realpathSync(path.resolve(process.argv[1]))
  : false;

if (isCli) {
  await runAgentify();
}
