import { readMemoryIndex } from "../engine/memory.js";
import { log } from "../util/log.js";
import kleur from "kleur";

export const cmdStatus = async (opts: { cwd: string }): Promise<void> => {
  const idx = readMemoryIndex(opts.cwd);
  log.banner(`ai-sdlc status — ${idx.project.name}`);
  console.log(`Kind:       ${idx.project.kind ?? "(unset)"}`);
  console.log(`Team mode:  ${idx.project.teamMode ?? "(unset)"}`);
  console.log(`Generated:  ${idx.generatedAt}`);
  console.log(`Index ver:  ${idx.version}`);
  console.log("");
  console.log(kleur.bold("Requirements:"));
  if (idx.requirements.items.length === 0) {
    log.dim("  (none yet)");
  } else {
    for (const r of idx.requirements.items) {
      console.log(
        `  ${kleur.cyan(r.id)}  ${kleur.bold(r.title)}  [${statusColor(r.status)}]`,
      );
    }
  }
  console.log("");
  console.log(kleur.bold("Decisions (ADRs):"));
  if (idx.decisions.items.length === 0) {
    log.dim("  (none yet)");
  } else {
    for (const d of idx.decisions.items) {
      console.log(
        `  ${kleur.cyan(d.id)}  ${kleur.bold(d.title)}  [${d.status}]`,
      );
    }
  }
};

const statusColor = (s: string): string => {
  switch (s) {
    case "Done":
      return kleur.green(s);
    case "Blocked":
      return kleur.red(s);
    case "Implemented":
    case "Evaluated":
      return kleur.cyan(s);
    case "Planned":
    case "Processed":
      return kleur.yellow(s);
    default:
      return kleur.dim(s);
  }
};
