export type PhotoCheckState = "pass" | "attention" | "unverified";
export type PhotoCheckKind = "technical" | "heuristic" | "manual";
export type PhotoCheck = {
  id: string;
  label: string;
  kind: PhotoCheckKind;
  state: PhotoCheckState;
  detail: string;
};

export type PhotoCheckReport = {
  version: 1;
  checkedAt: string;
  checks: PhotoCheck[];
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  error?: string;
};
