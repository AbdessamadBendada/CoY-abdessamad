import { describe, expect, it } from "vitest";
import { assertSafeTestEnvironment } from "../helpers/test-environment";

describe("test database safety guard", () => {
  it("accepts an explicitly local disposable test database", () => {
    expect(() =>
      assertSafeTestEnvironment({
        NODE_ENV: "test",
        TEST_DATABASE_URL: "postgresql://postgres:secret@localhost:5432/coy_test",
      }),
    ).not.toThrow();
  });

  it("rejects running outside NODE_ENV=test", () => {
    expect(() =>
      assertSafeTestEnvironment({
        NODE_ENV: "production",
        TEST_DATABASE_URL: "postgresql://postgres:secret@localhost:5432/coy_test",
      }),
    ).toThrow(/NODE_ENV=test/);
  });

  it("rejects a production-looking database even when NODE_ENV is test", () => {
    expect(() =>
      assertSafeTestEnvironment({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://app@production-db.example.com:5432/coy_live",
      }),
    ).toThrow(/Refusing to run tests/);
  });

  it("rejects an unlabelled remote database instead of guessing that it is safe", () => {
    expect(() =>
      assertSafeTestEnvironment({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://app@db.example.com:5432/coy",
      }),
    ).toThrow(/not explicitly marked test\/development/);
  });
});
