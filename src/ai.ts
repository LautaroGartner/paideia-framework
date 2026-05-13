import type { AiResourceAction } from "./resource.js";

export type SummarizeRecordOptions = {
  name: string;
  label?: string;
  log?: string;
};

function summarizeRecord(
  options: SummarizeRecordOptions
): AiResourceAction {
  return {
    name: options.name,
    label: options.label ?? "Summarize",
    type: "ai",
    capability: "summarizeRecord",
    log: options.log,
  };
}

export const ai = {
  summarizeRecord,
};