import { ApiError } from '@/api/client';

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fieldErrors = err.details?.fieldErrors as Record<string, string[]> | undefined;
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const detail = Object.entries(fieldErrors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('; ');
      return `${err.message} (${detail})`;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}
