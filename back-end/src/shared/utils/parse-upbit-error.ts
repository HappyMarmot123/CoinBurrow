import { Logger } from '@nestjs/common';
import axios from 'axios';

interface ParsedError {
  status: number;
  message: string;
}

export function parseUpbitError(error: any, context?: string): ParsedError {
  const logger = new Logger('UpbitApiError');
  const contextMessage = context ? ` (${context})` : '';

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.error?.message || 'Upbit API request failed';

    if (status >= 500) {
      logger.error(`Upbit API Error${contextMessage}: ${status}`, error.stack);
    }

    return { status, message: `[Upbit] ${message}` };
  }

  logger.error(
    `Failed due to an unexpected error${contextMessage}`,
    error.stack,
  );
  return {
    status: 500,
    message: 'An unexpected internal error occurred.',
  };
}
