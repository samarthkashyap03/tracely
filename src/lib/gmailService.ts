const ACCESS_TOKEN_KEY = "gmail_access_token";
const EXPIRES_AT_KEY = "gmail_expires_at";
const CONSENT_KEY = "gmail_consent_granted";
const LOOKBACK_DAYS_KEY = "gmail_scan_lookback";

export const DEFAULT_GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
  "1046909062332-placeholder.apps.googleusercontent.com";

export function getStoredClientId(): string {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (envId) return envId.trim();
  return DEFAULT_GOOGLE_CLIENT_ID;
}

export function getGmailAccessToken(): string | null {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const expiresAt = sessionStorage.getItem(EXPIRES_AT_KEY);
    if (token && expiresAt) {
      if (Date.now() < Number(expiresAt)) {
        return token;
      } else {
        disconnectGmail();
      }
    }
  }
  return null;
}

export function isGmailConnected(): boolean {
  return !!getGmailAccessToken();
}

export function getEmailConsent(): boolean {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(CONSENT_KEY) === "true";
  }
  return false;
}

export function setEmailConsent(consent: boolean) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(CONSENT_KEY, String(consent));
  }
}

export function getScanLookbackDays(): number {
  if (typeof window !== "undefined") {
    const val = sessionStorage.getItem(LOOKBACK_DAYS_KEY);
    if (val) return Number(val);
  }
  return 1; // Default to present day (1 day)
}

export function setScanLookbackDays(days: number) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(LOOKBACK_DAYS_KEY, String(days));
  }
}

export function initiateGmailLogin() {
  const clientId = getStoredClientId();
  const redirectUri = window.location.origin + window.location.pathname;
  const scope = "https://www.googleapis.com/auth/gmail.readonly";
  
  // Generate a cryptographically secure random state parameter to prevent CSRF / State tampering
  const state = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  if (typeof window !== "undefined") {
    sessionStorage.setItem("gmail_oauth_state", state);
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId,
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(
    scope,
  )}&state=${encodeURIComponent(state)}`;

  setEmailConsent(true);
  window.location.href = url;
}

export function handleOAuthRedirect(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  if (!hash) return false;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");
  const state = params.get("state");

  const savedState = sessionStorage.getItem("gmail_oauth_state");

  // Validate the redirect state parameter against our saved dynamic state nonce
  if (accessToken && state && savedState && state === savedState) {
    const expiresAt = Date.now() + Number(expiresIn || 3600) * 1000;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
    setEmailConsent(true);
    sessionStorage.removeItem("gmail_oauth_state"); // Clear state nonce after use

    // Clear hash from URL cleanly
    window.history.replaceState(
      null,
      document.title,
      window.location.pathname + window.location.search,
    );
    return true;
  }
  return false;
}

export function disconnectGmail() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.setItem(CONSENT_KEY, "false");
    // Also clean up any legacy keys stored in localStorage
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  }
}

export interface EmailMessage {
  id: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  from: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  body?: { data?: string };
  parts?: GmailPart[];
  mimeType?: string;
}

// Decodes Gmail base64-encoded body safely
function decodeGmailBody(data: string): string {
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
  } catch (e) {
    console.error("Failed to decode base64 body:", e);
    return "";
  }
}

// Recursively parse parts of a message body
function parseMessagePart(part: GmailPart): string {
  if (!part) return "";

  if (part.body && part.body.data) {
    return decodeGmailBody(part.body.data);
  }

  if (part.parts && Array.isArray(part.parts)) {
    // Try to find plain text first
    const plainTextPart = part.parts.find((p) => p.mimeType === "text/plain");
    if (plainTextPart) return parseMessagePart(plainTextPart);

    // Otherwise HTML
    const htmlPart = part.parts.find((p) => p.mimeType === "text/html");
    if (htmlPart) return parseMessagePart(htmlPart);

    // Recursively parse all parts if necessary
    return part.parts.map((p) => parseMessagePart(p)).join("\n");
  }

  return "";
}

export async function fetchRecentEmails(
  token: string,
  lookbackDays: number,
): Promise<EmailMessage[]> {
  // Query Gmail for all emails in the selected lookback period (e.g. newer_than:1d or newer_than:7d)
  const query = `newer_than:${lookbackDays}d`;
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query,
  )}&maxResults=300`;

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    let errorDetail = "";
    try {
      const errJson = await listRes.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = listRes.statusText || `Status ${listRes.status}`;
    }
    throw new Error(`Gmail API failed: ${errorDetail}`);
  }

  const listData = await listRes.json();
  const messages = (listData.messages || []) as Array<{ id: string }>;

  const detailedEmails: EmailMessage[] = [];
  const batchSize = 15;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (msg) => {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!msgRes.ok) return null;

          const detail = await msgRes.json();
          const headers = (detail.payload?.headers || []) as GmailHeader[];

          const subject =
            headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
          const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
          const date = headers.find((h) => h.name.toLowerCase() === "date")?.value || "";
          const snippet = (detail.snippet || "") as string;

          // Parse the body
          let body = parseMessagePart(detail.payload as GmailPart);
          if (!body) {
            body = snippet; // Fallback to snippet if body is empty
          }

          return {
            id: msg.id,
            subject,
            snippet,
            body,
            date,
            from,
          };
        } catch (e) {
          console.error(`Failed to load details for message ${msg.id}:`, e);
          return null;
        }
      })
    );

    for (const res of batchResults) {
      if (res) {
        detailedEmails.push(res);
      }
    }
  }

  return detailedEmails;
}
