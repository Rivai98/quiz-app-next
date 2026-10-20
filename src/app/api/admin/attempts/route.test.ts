import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
import { GET } from "./route";
afterEach(() => vi.unstubAllEnvs());
it("rejects unauthenticated report requests without caching or exposing report data", async () => {
  const response = await GET(new Request("http://localhost/api/admin/attempts?quizId=bad"));
  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(await response.json()).toEqual({ error: "غير مصرح" });
});
