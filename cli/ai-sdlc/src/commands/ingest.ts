import path from "node:path";
import { ingestFile } from "../engine/ingest.js";
import { ok, info } from "../util/log.js";

export interface IngestCmdOpts {
  cwd: string;
  source: string;
  adapter?: string;
}

export const cmdIngest = async (opts: IngestCmdOpts): Promise<void> => {
  const file = path.resolve(opts.cwd, opts.source);
  const r = ingestFile(opts.cwd, file, opts.adapter);
  ok(
    `adapter=${r.adapter}; imported=${r.imported.length}; duplicates=${r.duplicates.length}`,
  );
  if (r.imported.length) info(`new ids: ${r.imported.join(", ")}`);
  if (r.duplicates.length) info(`skipped duplicates: ${r.duplicates.length}`);
};
