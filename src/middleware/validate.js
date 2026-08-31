import { AppError } from "../lib/AppError.js";

const formatIssues = (error) =>
    error.issues.map((issue) => ({
        field: issue.path.join(".") || "(body)",
        message: issue.message,
    }));

export const validate = (schemas) => (req, res, next) => {
    req.valid ??= {};

    for (const source of ["params", "body", "query"]) {
        const schema = schemas[source];
        if (!schema) continue;

        const result = schema.safeParse(req[source]);

        if (!result.success) {
            throw new AppError(400, "Validation failed", formatIssues(result.error));
        }

        req.valid[source] = result.data;
    }

    next();
};