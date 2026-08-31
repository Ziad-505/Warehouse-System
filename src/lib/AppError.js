/**
 * An error we threw on purpose, carrying the HTTP status the client should see.
 *
 * Anything that is NOT an AppError reaching the error handler is treated as a
 * bug: it gets logged in full and the client is told nothing but "500".
 */
export class AppError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.details = details;

        // Drop this constructor from the stack trace so it points at the
        // line that actually threw.
        Error.captureStackTrace(this, this.constructor);
    }
}
