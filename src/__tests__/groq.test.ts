import { describe, it, expect, beforeEach } from "vitest";
import {
  getGroqApiKey,
  setGroqApiKey,
  clearGroqApiKey,
  getGroqModel,
  setGroqModel,
  DEFAULT_GROQ_MODEL,
  GROQ_MODELS,
} from "@/lib/groq";

describe("Groq key/model helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  // ── API key ─────────────────────────────────────────────────────────────
  describe("getGroqApiKey", () => {
    it("returns empty string when nothing is set", () => {
      expect(getGroqApiKey()).toBe("");
    });

    it("returns the key after setGroqApiKey", () => {
      setGroqApiKey("sk-test-key");
      expect(getGroqApiKey()).toBe("sk-test-key");
    });

    it("setGroqApiKey trims whitespace", () => {
      setGroqApiKey("  sk-padded  ");
      expect(getGroqApiKey()).toBe("sk-padded");
    });
  });

  describe("clearGroqApiKey", () => {
    it("removes the stored key", () => {
      setGroqApiKey("sk-test");
      clearGroqApiKey();
      expect(getGroqApiKey()).toBe("");
    });
  });

  // ── Model ────────────────────────────────────────────────────────────────
  describe("getGroqModel", () => {
    it("returns the default model when nothing is stored", () => {
      expect(getGroqModel()).toBe(DEFAULT_GROQ_MODEL);
    });

    it("returns the model after setGroqModel", () => {
      setGroqModel("llama3-8b-8192");
      expect(getGroqModel()).toBe("llama3-8b-8192");
    });

    it("setGroqModel trims whitespace", () => {
      setGroqModel("  mixtral-8x7b-32768  ");
      expect(getGroqModel()).toBe("mixtral-8x7b-32768");
    });
  });

  // ── Constants ────────────────────────────────────────────────────────────
  describe("GROQ_MODELS", () => {
    it("contains the default model", () => {
      const ids = GROQ_MODELS.map((m) => m.id);
      expect(ids).toContain(DEFAULT_GROQ_MODEL);
    });

    it("every model has id and name", () => {
      for (const m of GROQ_MODELS) {
        expect(typeof m.id).toBe("string");
        expect(typeof m.name).toBe("string");
      }
    });
  });
});
