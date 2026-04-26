/**
 * Public API surface for `ai-sdlc` (when consumed as a library).
 * Most users will use the CLI, but exposing key engine pieces keeps the
 * tool extensible for power users embedding `ai-sdlc` into their own
 * scripts.
 */
export { runWizard } from "./engine/wizard.js";
export { renderAgents } from "./engine/renderers.js";
export {
  renderPrompts,
  loadPrompts,
  type NeutralPrompt,
} from "./engine/prompt-renderers.js";
export {
  runBrainstorm,
  loadBrief,
  briefToMarkdown,
} from "./engine/brainstorm.js";
export { runAutopilot } from "./engine/autopilot.js";
export { classifyText } from "./engine/classifier.js";
export {
  ingestFile,
  detectAdapter,
  getAdapter,
  type IngestReport,
} from "./engine/ingest.js";
export {
  readLock,
  writeLock,
  defaultLock,
  isReady,
  unlock,
  type BootstrapLock,
} from "./engine/bootstrap-lock.js";
export {
  acquireRequirementLock,
  releaseRequirementLock,
  readRequirementLock,
  listRequirementLocks,
  type RequirementLock,
} from "./engine/requirement-lock.js";
export {
  detectExisting,
  audit as auditAdoption,
  captureSnapshot,
  writeFindings,
  writeAdoptionReport,
  applySafeFixes,
  type DetectionReport,
  type AuditFinding,
  type SafeFixResult,
} from "./engine/adopt-deep.js";
export { nextLogPath, todayIso } from "./util/agent-log.js";
export type {
  BrainstormBrief,
  AutopilotConfig,
  WizardAnswers,
  ProjectKind,
  Vendor,
  Architecture,
  DataClass,
  CiProvider,
} from "./types.js";
export { listProjectKinds, getStack, type StackId } from "./engine/registry.js";
export {
  readMemoryIndex,
  writeMemoryIndex,
  type MemoryIndex,
} from "./engine/memory.js";
export { sha256OfFile, sha256OfString } from "./engine/hashes.js";
