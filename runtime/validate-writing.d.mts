export type WritingDiagnostic = {
  code: string;
  severity: "error" | "warning";
  path: string;
  message: string;
  [key: string]: unknown;
};

export function validateWritingPosts(posts: unknown): {
  ok: boolean;
  diagnostics: WritingDiagnostic[];
};
