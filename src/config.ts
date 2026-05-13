export type BuildMode = "development" | "production";

export type FrameworkConfig = {
  mode: BuildMode;
  inspect: boolean;
  logs: boolean;
};

const mode: BuildMode =
  process.env.NODE_ENV === "production"
    ? "production"
    : "development";

export const config: FrameworkConfig = {
  mode,
  inspect: mode === "development",
  logs: mode === "development",
};