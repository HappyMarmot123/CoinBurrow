import type { ZodType } from "zod";

import { createNormalizedError, type NormalizedError } from "../validation/error/normalized-error.js";
import { parseWithSchema } from "../validation/parse.js";
import {
  apiEnvelopeErrorToNormalizedError,
  apiEnvelopeSchema,
} from "../validation/schemas/api/api-envelope.js";

export class ApiValidationError extends Error {
  constructor(public readonly normalizedError: NormalizedError) {
    super(normalizedError.message);
    this.name = "ApiValidationError";
  }
}

export async function getJson<T>(url: string, schema: ZodType<T>): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (cause) {
    throw new ApiValidationError(
      createNormalizedError({
        source: "http",
        code: "NETWORK_ERROR",
        message: "Network request failed",
        detail: cause instanceof Error ? { name: cause.name, message: cause.message } : undefined,
      }),
    );
  }

  const body = await readJson(response, url);
  const parsed = parseWithSchema(apiEnvelopeSchema(schema), body, "http");

  if (!parsed.ok) {
    throw new ApiValidationError(parsed.error);
  }

  if (!parsed.data.success) {
    throw new ApiValidationError(apiEnvelopeErrorToNormalizedError(parsed.data, "http"));
  }

  if (!response.ok) {
    throw new ApiValidationError(
      createNormalizedError({
        source: "http",
        code: "UPSTREAM_ERROR",
        message: `${url} -> ${response.status}`,
        detail: { status: response.status },
      }),
    );
  }

  return parsed.data.data;
}

async function readJson(response: Response, url: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new ApiValidationError(
      createNormalizedError({
        source: "http",
        code: "SCHEMA_MISMATCH",
        message: `${url} -> invalid JSON response`,
        detail: cause instanceof Error ? { name: cause.name, message: cause.message } : undefined,
      }),
    );
  }
}
