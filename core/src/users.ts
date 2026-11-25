import { z } from "zod";

const name = z.string().trim().min(3, "Name must be at least 3 characters");
const email = z.email("Enter a valid email address").toLowerCase();
// One minimum everywhere a password is set: this schema (the user form and /api/users) and Better Auth's own
// change-password routes (server/src/auth.ts). Signing in is never checked against it, so older, shorter passwords still work
export const MIN_PASSWORD_LENGTH = 12;

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128, "Password must be at most 128 characters");

// Shared by the client form and the POST /api/users handler
export const createUserSchema = z.object({ name, email, password });

// PATCH /api/users/:id. A blank password means "keep the current one"
export const updateUserSchema = z.object({
  name,
  email,
  password: z.preprocess((value) => (value === "" ? undefined : value), password.optional()),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
