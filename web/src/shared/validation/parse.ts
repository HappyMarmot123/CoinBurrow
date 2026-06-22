import type { ZodType } from "zod";

import type { NormalizedError, NormalizedErrorSource } from "./error/normalized-error.js";
import { toNormalizedError } from "./error/normalized-error.js";

export type Parsed<T> =
  | { ok: true; data: T }
  | { ok: false; error: NormalizedError };

export function parseWithSchema<T>(
  schema: ZodType<T>,
  input: unknown,
  source: NormalizedErrorSource,
): Parsed<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: toNormalizedError({ source, zodError: result.error, input }) };
}
