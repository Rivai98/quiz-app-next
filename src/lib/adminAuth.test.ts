import { afterEach, expect, it, vi } from "vitest";
import { createAdminToken, verifyAdminToken, verifyPin } from "./adminAuth";

afterEach(() => vi.unstubAllEnvs());

it("fails closed in production without a password, including previously issued tokens", () => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("ADMIN_PIN", "");
  const token = createAdminToken();
  expect(verifyPin("1234")).toBe(true);
  vi.stubEnv("NODE_ENV", "production");
  expect(verifyPin("1234")).toBe(false);
  expect(verifyAdminToken(token)).toBe(false);
  expect(() => createAdminToken()).toThrow("ADMIN_NOT_CONFIGURED");
});

it("supports Unicode passwords and invalidates sessions on either credential rotation", () => {
  vi.stubEnv("ADMIN_PIN", "مثال-Test!42"); vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret-one");
  expect(verifyPin("مثال-Test!42")).toBe(true);
  expect(verifyPin("wrong")).toBe(false);
  const token = createAdminToken(1000);
  expect(verifyAdminToken(token, 1001)).toBe(true);
  expect(verifyAdminToken(token + "tampered", 1001)).toBe(false);
  expect(verifyAdminToken(token, 1000 + 8 * 3600000)).toBe(false);
  vi.stubEnv("ADMIN_PIN", "different-password");
  expect(verifyAdminToken(token, 1001)).toBe(false);
  vi.stubEnv("ADMIN_PIN", "مثال-Test!42"); vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret-two");
  expect(verifyAdminToken(token, 1001)).toBe(false);
});
