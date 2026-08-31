export type AppErrorCategory =
  'user' | 'validation' | 'engine' | 'worker' | 'persistence' | 'export' | 'render';

export class AppError extends Error {
  public constructor(
    public readonly category: AppErrorCategory,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}

export function classifyError(error: unknown, fallback: AppErrorCategory): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : 'Unexpected application failure';
  return new AppError(fallback, message, error instanceof Error ? { cause: error } : undefined);
}

export function safeErrorMessage(error: unknown, fallback: AppErrorCategory): string {
  const classified = classifyError(error, fallback);
  return `${classified.category[0].toUpperCase()}${classified.category.slice(1)} error: ${classified.message}`;
}
