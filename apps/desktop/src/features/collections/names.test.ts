import { describe, expect, it } from "vitest";
import { MAX_NAME_CHARS, nameError, nameLength } from "./names";

describe("collection names", () => {
  it("accepts a trimmed, non-blank name", () => {
    expect(nameError("  Late night  ")).toBeNull();
    expect(nameLength("  Late night  ")).toBe(10);
  });

  it("rejects blank, overlong and control-character names", () => {
    expect(nameError("   ")).toBe("Enter a name.");
    expect(nameError("a".repeat(MAX_NAME_CHARS + 1))).toBe("Use 100 characters or fewer.");
    expect(nameError("a\u0007b")).toBe("Remove control characters.");
  });

  it("counts characters the way the catalog does, not UTF-16 units", () => {
    const emoji = "🎧".repeat(MAX_NAME_CHARS);
    expect(emoji.length).toBe(MAX_NAME_CHARS * 2);
    expect(nameError(emoji)).toBeNull();
  });
});
