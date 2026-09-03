import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 7;

// `overrides` exists so tests can mint an already-expired token. Production
// callers pass a user and nothing else.
export const signAccessToken = (user, overrides = {}) =>
    jwt.sign(
        { role: user.role },              // claims that travel in the token
        process.env.JWT_SECRET,           // the signing key
        { subject: String(user.id), expiresIn: ACCESS_TTL, ...overrides }
    );

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

// A refresh token is 256 bits of randomness, not something a human chose, so
// there is no dictionary to attack. A fast hash is the right tool -- argon2
// would add ~100ms to every refresh and buy nothing. Hash choice follows the
// entropy of the input, not habit.
export const hashRefreshToken = (token) => createHash("sha256").update(token).digest("hex");

export const newRefreshToken = () => {
    const token = randomBytes(32).toString("base64url");
    return {
        token,                                // returned to the client once, never stored
        tokenHash: hashRefreshToken(token),   // all the server keeps
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
    };
};
