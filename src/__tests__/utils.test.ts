import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class merge utility)", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("merges multiple classes", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves Tailwind conflicts — last value wins", () => {
    // tailwind-merge should keep only py-4
    expect(cn("py-2", "py-4")).toBe("py-4");
  });

  it("filters out falsy values", () => {
    expect(cn("text-sm", false, undefined, null as unknown as string, "font-bold")).toBe(
      "text-sm font-bold",
    );
  });

  it("handles conditional expressions", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
    expect(cn("base", !active && "inactive")).toBe("base");
  });

  it("merges object syntax", () => {
    expect(cn({ "text-blue-500": true, "text-red-500": false })).toBe("text-blue-500");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
