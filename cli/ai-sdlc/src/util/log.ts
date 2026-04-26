import kleur from "kleur";

const isQuiet = () => process.env.AGENT_MEM_QUIET === "1";

export const log = {
  info: (msg: string) => {
    if (!isQuiet()) console.log(msg);
  },
  ok: (msg: string) => {
    if (!isQuiet()) console.log(`${kleur.green("✓")} ${msg}`);
  },
  warn: (msg: string) => {
    if (!isQuiet()) console.warn(`${kleur.yellow("⚠")} ${msg}`);
  },
  err: (msg: string) => {
    console.error(`${kleur.red("✗")} ${msg}`);
  },
  step: (msg: string) => {
    if (!isQuiet()) console.log(`${kleur.cyan("›")} ${msg}`);
  },
  dim: (msg: string) => {
    if (!isQuiet()) console.log(kleur.dim(msg));
  },
  banner: (title: string) => {
    if (isQuiet()) return;
    const bar = kleur.cyan("─".repeat(Math.max(8, title.length + 4)));
    console.log("");
    console.log(bar);
    console.log(`  ${kleur.bold(title)}`);
    console.log(bar);
    console.log("");
  },
};

export const fail = (msg: string, code = 1): never => {
  log.err(msg);
  process.exit(code);
};

// Named exports for ergonomic imports.
export const ok = (msg: string) => log.ok(msg);
export const info = (msg: string) => log.info(msg);
export const warn = (msg: string) => log.warn(msg);
export const step = (msg: string) => log.step(msg);
