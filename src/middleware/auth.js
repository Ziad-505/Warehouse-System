import { AppError } from "../lib/AppError.js";
import { verifyAccessToken } from "../lib/tokens.js";

export const requireAuth = (req, res, next) => {

    const [scheme, token] = (req.headers.authorization ?? "").split(" ");

    if (scheme !== "Bearer" || !token) {
        throw new AppError(401, "Authentication required");
    }

    let payload;
    try {
        payload = verifyAccessToken(token);
    } catch {

        throw new AppError(401, "Invalid or expired token");
    }

    req.user = { id: Number(payload.sub), role: payload.role };

    next();
};

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) throw new AppError(401, "Authentication required");

    if (!roles.includes(req.user.role)) {
        throw new AppError(403, "You do not have permission to do that");
    }

    next();
};