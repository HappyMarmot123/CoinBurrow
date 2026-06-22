import type { ZodError } from "zod";

import { isRetryableCode, type NormalizedErrorCode } from "./code.js";

export type NormalizedErrorSource = "http" | "websocket" | "worker" | "internal";

export interface NormalizedError {
  source: NormalizedErrorSource;
  code: NormalizedErrorCode;
  message: string;
  detail?: unknown;
  path?: string;
  retryable: boolean;
  provider?: string;
}

interface CreateNormalizedErrorInput {
  source: NormalizedErrorSource;
  code: NormalizedErrorCode;
  message: string;
  detail?: unknown;
  path?: string;
  retryable?: boolean;
  provider?: string;
}

interface ToNormalizedErrorInput {
  source: NormalizedErrorSource;
  zodError: ZodError;
  input?: unknown;
  code?: NormalizedErrorCode;
  message?: string;
  provider?: string;
}

export function createNormalizedError({
  source,
  code,
  message,
  detail,
  path,
  retryable,
  provider,
}: CreateNormalizedErrorInput): NormalizedError {
  return {
    source,
    code,
    message,
    ...(detail === undefined ? {} : { detail }),
    ...(path === undefined ? {} : { path }),
    retryable: retryable ?? isRetryableCode(code),
    ...(provider === undefined ? {} : { provider }),
  };
}

export function toNormalizedError({
  source,
  zodError,
  input,
  code = "SCHEMA_MISMATCH",
  message = "Payload does not match the expected schema",
  provider,
}: ToNormalizedErrorInput): NormalizedError {
  const firstIssue = zodError.issues[0];

  return createNormalizedError({
    source,
    code,
    message,
    path: firstIssue?.path.map(String).join(".") || undefined,
    retryable: source !== "internal",
    provider,
    detail: {
      issues: zodError.issues.slice(0, 5).map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.map(String).join("."),
      })),
      sample: summarizeInput(input),
    },
  });
}

function summarizeInput(input: unknown): unknown {
  if (input === null) return { type: "null" };
  if (Array.isArray(input)) {
    return {
      type: "array",
      length: input.length,
      first: summarizeInput(input[0]),
    };
  }
  if (typeof input === "object") {
    return {
      type: "object",
      keys: Object.keys(input as Record<string, unknown>).slice(0, 10),
    };
  }
  return { type: typeof input };
}
