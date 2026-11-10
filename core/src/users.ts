import { z } from "zod";

const name = z.string().trim().min(3, "Name must be at least 3 characters");
const email = z.email("Enter a valid email address").toLowerCase();
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
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
