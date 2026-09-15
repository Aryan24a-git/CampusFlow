export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const HTTP = {
  badRequest: (msg: string) => new AppError(msg, 400),
  unauthorized: (msg = 'Unauthorized') => new AppError(msg, 401),
  forbidden: (msg = 'Forbidden') => new AppError(msg, 403),
  notFound: (msg: string) => new AppError(msg, 404),
  conflict: (msg: string) => new AppError(msg, 409),
  serverError: (msg = 'Internal server error') => new AppError(msg, 500),
};
