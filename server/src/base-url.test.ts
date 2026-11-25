import { describe, expect, it } from "vitest";
import { requireBaseUrl } from "./base-url";

describe("requireBaseUrl", () => {
  it("refuses to start in production without BETTER_AUTH_URL, with a message that says what to set", () => {
    expect(() => requireBaseUrl({ NODE_ENV: "production" })).toThrow(/BETTER_AUTH_URL must be set in production/);
    expect(() => requireBaseUrl({ NODE_ENV: "production" })).toThrow(/https/);
  });

  it("treats an empty or blank value as unset in production", () => {
    expect(() => requireBaseUrl({ NODE_ENV: "production", BETTER_AUTH_URL: "" })).toThrow(/BETTER_AUTH_URL/);
    expect(() => requireBaseUrl({ NODE_ENV: "production", BETTER_AUTH_URL: "   " })).toThrow(/BETTER_AUTH_URL/);
  });

  it("returns the value unchanged when it is set in production, so the current deployment is unaffected", () => {
    expect(requireBaseUrl({ NODE_ENV: "production", BETTER_AUTH_URL: "https://server-production-5f181a11.up.railway.app" })).toBe(
      "https://server-production-5f181a11.up.railway.app",
    );
  });

  it("lets development, test and an unset NODE_ENV leave it unset, as before", () => {
    for (const NODE_ENV of ["development", "test", undefined]) {
      expect(requireBaseUrl({ NODE_ENV }), String(NODE_ENV)).toBeUndefined();
    }
  });

  it("passes a value through outside production too", () => {
    expect(requireBaseUrl({ NODE_ENV: "test", BETTER_AUTH_URL: "http://localhost:3100" })).toBe("http://localhost:3100");
  });

  it("only looks at NODE_ENV exactly production, so a value such as Production is not treated as one", () => {
    expect(requireBaseUrl({ NODE_ENV: "Production" })).toBeUndefined();
  });
});
