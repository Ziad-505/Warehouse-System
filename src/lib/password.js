import argon2 from "argon2";

export const hashPassword = (plain) => argon2.hash(plain, { type: argon2.argon2id });

export const verifyPassword = (hash, plain) => argon2.verify(hash, plain);