import { MIN_PASSWORD_LENGTH, createUserSchema, updateUserSchema } from "@helpdesk/core";
import { describe, expect, it } from "vitest";

const base = { name: "New Agent", email: "new@test.local" };

describe("password minimum", () => {
  it("is 12 characters, matching the seed and reset scripts and the docs", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });

  it("createUserSchema rejects 11 characters and accepts exactly 12", () => {
    const short = createUserSchema.safeParse({ ...base, password: "a".repeat(11) });
    expect(short.success).toBe(false);
    expect(short.error?.issues[0].message).toBe("Password must be at least 12 characters");

    expect(createUserSchema.safeParse({ ...base, password: "a".repeat(12) }).success).toBe(true);
  });

  it("no longer accepts the old 8 to 11 character passwords", () => {
    for (const length of [8, 9, 10, 11]) {
      expect(createUserSchema.safeParse({ ...base, password: "x".repeat(length) }).success, String(length)).toBe(false);
    }
    expect(createUserSchema.safeParse({ ...base, password: "password123" }).success).toBe(false);
  });

  it("keeps the 128 character maximum", () => {
    expect(createUserSchema.safeParse({ ...base, password: "a".repeat(128) }).success).toBe(true);
    expect(createUserSchema.safeParse({ ...base, password: "a".repeat(129) }).success).toBe(false);
  });

  it("updateUserSchema applies it to a new password, but a blank one still means keep the current password", () => {
    expect(updateUserSchema.safeParse({ ...base, password: "a".repeat(11) }).success).toBe(false);
    expect(updateUserSchema.safeParse({ ...base, password: "a".repeat(12) }).success).toBe(true);

    // An existing user with a shorter password can still be renamed, without touching it
    expect(updateUserSchema.parse({ ...base, password: "" }).password).toBeUndefined();
    expect(updateUserSchema.safeParse(base).success).toBe(true);
  });
});
