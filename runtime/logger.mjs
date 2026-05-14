import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const LOG_DIR = path.join(ROOT, ".paideia", "logs");
const LOG_FILE = path.join(LOG_DIR, "runtime.log");
const CRASH_LOG_FILE = path.join(LOG_DIR, "crash.log");

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function write(entry) {
  ensureLogDir();

  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
}

export function log(level, message, meta = {}) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  console.log(`[paideia] ${message}`);

  write(entry);
}

export function info(message, meta) {
  log("info", message, meta);
}

export function warn(message, meta) {
  log("warn", message, meta);
}

export function error(message, meta) {
  log("error", message, meta);
}

export function crash(message, meta = {}) {
  const entry = {
    time: new Date().toISOString(),
    level: "crash",
    message,
    ...meta,
  };

  console.error(`[paideia] crash: ${message}`);

  ensureLogDir();
  fs.appendFileSync(CRASH_LOG_FILE, `${JSON.stringify(entry)}\n`);
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
}
