import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGmailAccessToken,
  isGmailConnected,
  getEmailConsent,
  setEmailConsent,
  getScanLookbackDays,
  setScanLookbackDays,
  disconnectGmail,
  handleOAuthRedirect,
} from "@/lib/gmailService";

/** Helper: store a not-yet-expired access token in sessionStorage */
function storeValidToken(token = "valid-token", ttlMs = 3_600_000) {
  sessionStorage.setItem("gmail_access_token", token);
  sessionStorage.setItem("gmail_expires_at", String(Date.now() + ttlMs));
}

describe("Gmail service helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  // ── Token retrieval ───────────────────────────────────────────────────
  describe("getGmailAccessToken", () => {
    it("returns null when nothing is stored", () => {
      expect(getGmailAccessToken()).toBeNull();
    });

    it("returns the token when it has not expired", () => {
      storeValidToken("my-token");
      expect(getGmailAccessToken()).toBe("my-token");
    });

    it("returns null and clears storage when token is expired", () => {
      sessionStorage.setItem("gmail_access_token", "old-token");
      sessionStorage.setItem("gmail_expires_at", String(Date.now() - 1000)); // in the past
      expect(getGmailAccessToken()).toBeNull();
      expect(sessionStorage.getItem("gmail_access_token")).toBeNull();
    });
  });

  // ── Connection state ──────────────────────────────────────────────────
  describe("isGmailConnected", () => {
    it("is false with no token", () => {
      expect(isGmailConnected()).toBe(false);
    });

    it("is true with a valid token", () => {
      storeValidToken();
      expect(isGmailConnected()).toBe(true);
    });
  });

  // ── Consent ───────────────────────────────────────────────────────────
  describe("getEmailConsent / setEmailConsent", () => {
    it("defaults to false", () => {
      expect(getEmailConsent()).toBe(false);
    });

    it("stores and retrieves true", () => {
      setEmailConsent(true);
      expect(getEmailConsent()).toBe(true);
    });

    it("stores and retrieves false", () => {
      setEmailConsent(true);
      setEmailConsent(false);
      expect(getEmailConsent()).toBe(false);
    });
  });

  // ── Lookback days ─────────────────────────────────────────────────────
  describe("getScanLookbackDays / setScanLookbackDays", () => {
    it("defaults to 1", () => {
      expect(getScanLookbackDays()).toBe(1);
    });

    it("stores and retrieves a custom value", () => {
      setScanLookbackDays(7);
      expect(getScanLookbackDays()).toBe(7);
    });
  });

  // ── Disconnect ────────────────────────────────────────────────────────
  describe("disconnectGmail", () => {
    it("clears token, expiry, and sets consent to false", () => {
      storeValidToken();
      setEmailConsent(true);
      disconnectGmail();

      expect(sessionStorage.getItem("gmail_access_token")).toBeNull();
      expect(sessionStorage.getItem("gmail_expires_at")).toBeNull();
      expect(getEmailConsent()).toBe(false);
    });

    it("also clears legacy localStorage keys", () => {
      localStorage.setItem("gmail_access_token", "legacy");
      localStorage.setItem("gmail_expires_at", "123");
      disconnectGmail();

      expect(localStorage.getItem("gmail_access_token")).toBeNull();
      expect(localStorage.getItem("gmail_expires_at")).toBeNull();
    });
  });

  // ── OAuth redirect handler ────────────────────────────────────────────
  describe("handleOAuthRedirect", () => {
    it("returns false when there is no hash", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { hash: "", pathname: "/", search: "", origin: "http://localhost" },
      });
      expect(handleOAuthRedirect()).toBe(false);
    });

    it("returns true and stores token when hash and state match", () => {
      const state = "test-nonce-123";
      sessionStorage.setItem("gmail_oauth_state", state);

      const hash = `#access_token=tok123&expires_in=3600&token_type=Bearer&state=${state}`;
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          hash,
          pathname: "/dashboard",
          search: "",
          origin: "http://localhost",
          href: `http://localhost/dashboard${hash}`,
        },
      });
      // history.replaceState is not in jsdom by default
      window.history.replaceState = vi.fn();

      const result = handleOAuthRedirect();
      expect(result).toBe(true);
      expect(sessionStorage.getItem("gmail_access_token")).toBe("tok123");
      // State nonce must be cleared after use
      expect(sessionStorage.getItem("gmail_oauth_state")).toBeNull();
    });

    it("returns false when state does not match (CSRF guard)", () => {
      sessionStorage.setItem("gmail_oauth_state", "correct-state");

      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          hash: "#access_token=tok&expires_in=3600&state=WRONG-STATE",
          pathname: "/",
          search: "",
          origin: "http://localhost",
        },
      });

      expect(handleOAuthRedirect()).toBe(false);
      expect(sessionStorage.getItem("gmail_access_token")).toBeNull();
    });
  });
});
