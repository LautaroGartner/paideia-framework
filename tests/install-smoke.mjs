import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);

const smokeRoot = path.join(
  os.tmpdir(),
  "paideia-install-smoke"
);

const packageRoot = path.join(
  smokeRoot,
  "package"
);

const appRoot = path.join(
  smokeRoot,
  "app"
);

fs.rmSync(smokeRoot, {
  recursive: true,
  force: true,
});

fs.mkdirSync(smokeRoot, {
  recursive: true,
});

fs.mkdirSync(packageRoot, {
  recursive: true,
});

fs.mkdirSync(appRoot, {
  recursive: true,
});

const npmEnv = {
  ...process.env,
  NPM_CONFIG_CACHE: path.join(smokeRoot, "npm-cache"),
};

const pack = spawnSync(
  "npm",
  ["pack", "--pack-destination", packageRoot, "--silent"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env: npmEnv,
  }
);

assert(
  pack.status === 0,
  "npm pack should succeed",
  {
    command: "npm pack",
    status: pack.status ?? 1,
    output: `${pack.stdout}${pack.stderr}`,
  }
);

const tarball = fs
  .readdirSync(packageRoot)
  .find((entry) => entry.endsWith(".tgz"));

assert(
  tarball,
  "npm pack should create a tarball",
  {
    command: "npm pack",
    status: 1,
    output: fs.readdirSync(packageRoot).join("\n"),
  }
);

const install = spawnSync(
  "npm",
  [
    "install",
    "--ignore-scripts",
    path.join(packageRoot, tarball),
  ],
  {
    cwd: appRoot,
    encoding: "utf8",
    env: npmEnv,
  }
);

assert(
  install.status === 0,
  "npm install from packed tarball should succeed",
  {
    command: "npm install",
    status: install.status ?? 1,
    output: `${install.stdout}${install.stderr}`,
  }
);

const cliPath = path.join(
  appRoot,
  "node_modules",
  ".bin",
  process.platform === "win32"
    ? "paideia.cmd"
    : "paideia"
);

const agentifyPath = path.join(
  appRoot,
  "node_modules",
  ".bin",
  process.platform === "win32"
    ? "agentify.cmd"
    : "agentify"
);

function runBin(binPath, name, args) {
  const result = spawnSync(
    binPath,
    args,
    {
      cwd: appRoot,
      encoding: "utf8",
    }
  );

  return {
    command: `${name} ${args.join(" ")}`,
    status: result.status ?? 1,
    output: `${result.stdout}${result.stderr}`,
  };
}

function run(args) {
  return runBin(cliPath, "paideia", args);
}

function runAgentify(args) {
  return runBin(agentifyPath, "agentify", args);
}

function assert(condition, message, result) {
  if (condition) {
    return;
  }

  console.error(`[smoke] ${message}`);

  if (result) {
    console.error(`[smoke] command: ${result.command}`);
    console.error(result.output.trim());
  }

  process.exit(1);
}

const version = run(["--version"]);
assert(version.status === 0, "--version should succeed", version);
assert(
  /^\d+\.\d+\.\d+/.test(version.output.trim()),
  "--version should print a semver-like version",
  version
);

const help = run(["--help"]);
assert(help.status === 0, "--help should succeed", help);
assert(
  help.output.includes("Paideia CLI"),
  "--help should print CLI help",
  help
);

const agentifyVersion = runAgentify(["--version"]);
assert(
  agentifyVersion.status === 0,
  "agentify --version should succeed",
  agentifyVersion
);
assert(
  agentifyVersion.output.trim() === "0.7.3-alpha.1",
  "agentify --version should print the agentify version",
  agentifyVersion
);

const agentifyHelp = runAgentify(["--help"]);
assert(
  agentifyHelp.status === 0,
  "agentify --help should succeed",
  agentifyHelp
);
assert(
  agentifyHelp.output.includes("Usage:") &&
    agentifyHelp.output.includes("agentify <url>"),
  "agentify --help should print CLI help",
  agentifyHelp
);

const doctor = run(["doctor"]);
assert(doctor.status !== 0, "doctor should fail before build", doctor);
assert(
  doctor.output.includes("run `paideia build`"),
  "doctor should guide the user to build first",
  doctor
);

for (const command of ["build", "dev"]) {
  const result = run([command]);

  assert(
    result.status !== 0,
    `${command} should fail outside a Paideia checkout`,
    result
  );

  assert(
    result.output.includes("no Paideia project found"),
    `${command} should explain that no Paideia project was found`,
    result
  );
}

for (const command of ["manifest", "schema", "explain"]) {
  const result = run([command]);

  assert(
    result.status !== 0,
    `${command} should fail before build`,
    result
  );

  assert(
    result.output.includes("run `paideia build` first"),
    `${command} should guide the user to build first`,
    result
  );
}

const start = run(["start"]);
assert(start.status !== 0, "start should fail before build", start);
assert(
  start.output.includes("run `paideia build`"),
  "start should guide the user to build first",
  start
);

console.log(
  `[smoke] installed CLI smoke passed in ${appRoot}`
);
