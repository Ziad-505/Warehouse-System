import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/AppError.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signAccessToken, newRefreshToken, hashRefreshToken } from "../lib/tokens.js";

// Everything the API is allowed to say about a user. Selecting explicitly beats
// remembering to delete passwordHash -- a column added later is private by default.
const publicUser = { id: true, email: true, role: true, createdAt: true };

const issueTokens = async (user) => {
    const { token, tokenHash, expiresAt } = newRefreshToken();
    await prisma.refreshToken.create({ data: { tokenHash, userId: user.id, expiresAt } });
    return {
        accessToken: signAccessToken(user),
        refreshToken: token,
        user: { id: user.id, email: user.email, role: user.role },
    };
};

export const register = async ({ email, password }) => {
    const passwordHash = await hashPassword(password);

    // A duplicate email raises P2002, which the error handler already turns into
    // a 409 -- no pre-check, and no race between checking and inserting.
    return prisma.user.create({ data: { email, passwordHash }, select: publicUser });
};

export const login = async ({ email, password }) => {
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

    // Hash even when the user does not exist, so an unknown email costs the same
    // ~100ms as a wrong password. Skip this and response timing quietly tells an
    // attacker which emails are registered.
    const ok = user
        ? await verifyPassword(user.passwordHash, password)
        : await hashPassword(password).then(() => false);

    // One message for both failures, for the same reason.
    if (!ok) throw new AppError(401, "Invalid email or password");

    return issueTokens(user);
};

export const refresh = async ({ refreshToken }) => {
    const record = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
        include: { user: true },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date() || record.user.deletedAt) {
        throw new AppError(401, "Invalid or expired refresh token");
    }

    // Rotation: this token is spent. If it is ever presented again, two parties
    // hold it and something is wrong.
    await prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
    });

    return issueTokens(record.user);
};

// This is what makes logout mean something. Without a server-side record there
// is nothing to invalidate and "log out" is just the client discarding a token.
export const logout = async ({ refreshToken }) => {
    await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
    });
};
