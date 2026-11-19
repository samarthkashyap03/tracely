import "@testing-library/jest-dom";

// Mock import.meta.env for all tests
(globalThis as unknown as Record<string, unknown>).import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
      VITE_GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
      VITE_GROQ_API_KEY: "",
    },
  },
};

// Reset sessionStorage between tests
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
