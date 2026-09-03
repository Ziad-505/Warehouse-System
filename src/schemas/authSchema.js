import { z } from "zod";

export const registerBody = z.strictObject({
    // toLowerCase matters: without it Ziad@x.com and ziad@x.com are two
    // accounts and the @unique constraint will not stop it.
    email: z.string().trim().toLowerCase().email().max(255),
    // Length beats complexity rules. A long passphrase is stronger and easier
    // to remember than a short string with punctuation in it.
    password: z.string().min(12, "password must be at least 12 characters").max(200),
});

export const loginBody = z.strictObject({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, "password is required"),
});

export const refreshBody = z.strictObject({
    refreshToken: z.string().min(1, "refreshToken is required"),
});
