import { applyReducedMotion, readReducedMotion, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("returns explicit preferences unchanged", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the OS when set to system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("reduced motion", () => {
  it("persists and applies the data attribute", () => {
    applyReducedMotion(true);
    expect(readReducedMotion()).toBe(true);
    expect(document.documentElement.dataset.reducedMotion).toBe("true");
    applyReducedMotion(false);
    expect(readReducedMotion()).toBe(false);
    expect(document.documentElement.dataset.reducedMotion).toBeUndefined();
  });
});
