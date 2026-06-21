const API_KEY_KEY = "groq_api_key";
const MODEL_KEY = "groq_model";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Recommended)" },
  { id: "llama3-8b-8192", name: "Llama 3 8B (Fast)" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
];

export function getGroqApiKey(): string {
  if (typeof window !== "undefined") {
    const localKey = sessionStorage.getItem(API_KEY_KEY);
    if (localKey) return localKey;
  }
  return (import.meta.env.VITE_GROQ_API_KEY as string) || "";
}

export function setGroqApiKey(key: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(API_KEY_KEY, key.trim());
  }
}

export function clearGroqApiKey() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(API_KEY_KEY);
  }
}

export function getGroqModel(): string {
  if (typeof window !== "undefined") {
    const model = sessionStorage.getItem(MODEL_KEY);
    if (model) return model;
  }
  return DEFAULT_GROQ_MODEL;
}

export function setGroqModel(model: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(MODEL_KEY, model.trim());
  }
}

export interface ParsedJobData {
  company_name: string;
  role: string | null;
  work_type: string | null;
  location: string | null;
  salary: string | null;
  platform: string | null;
  url: string | null;
  notes: string | null;
}

export async function parseJobDescription(text: string): Promise<ParsedJobData> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("Groq API key is missing. Please configure it in Settings or on this page.");
  }

  const model = getGroqModel();

  const systemPrompt = `You are a helpful recruitment AI assistant. 
Your task is to parse the user's pasted job description or job posting text and extract key information.

You must return a valid JSON object with the following fields:
- "company_name": Name of the company. If not mentioned in the text, guess or leave empty string "".
- "role": Job title / role (e.g. "Frontend Developer"),converted in english.
- "work_type": Work style. Must be one of: "Remote", "Hybrid", "On-site" (or null if not specified).
- "location": Physical location / city/country of the role (e.g. "Berlin, Germany")
- "salary": Salary range or figure if mentioned (e.g. "€80k - €100k"), or null.
- "platform": Platform where this job posting was found (e.g. "LinkedIn", "Indeed", "Glassdoor") if mentioned, or null.
- "url": Job link / URL if found in the text, or null.
- "notes": A concise, bulleted summary (2-3 bullets) listing key requirements or tech stack details (e.g. "* 3+ years React\\n* Experience with Tailwind CSS"). Max 50 words.In English.

Return ONLY the JSON object. Do not include any explanation or markdown formatting like \`\`\`json ... \`\`\`. Output raw JSON.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Please parse this job description and return the structured JSON data:\n\n${text}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Groq API Error: ${message}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response received from Groq model.");
    }

    const parsed = JSON.parse(content) as ParsedJobData;
    return parsed;
  } catch (error) {
    console.error("Error in parseJobDescription:", error);
    throw error;
  }
}

// Helper to fetch with retry backoff for rate limits (HTTP 429)
async function fetchWithGroqRetry(
  url: string,
  options: RequestInit,
  retries = 4,
  delay = 5000
): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 429 && retries > 0) {
    const retryAfterHeader = response.headers.get("retry-after");
    const waitTime = retryAfterHeader ? (Number(retryAfterHeader) * 1000) : delay;
    console.warn(`Groq Rate limit hit (429). Retrying in ${waitTime}ms...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime + 500)); // Add 500ms safety buffer
    return fetchWithGroqRetry(url, options, retries - 1, delay * 1.5);
  }
  return response;
}

export interface EmailAnalysisResult {
  is_relevant: boolean;
  is_rejection: boolean;
  company_name: string | null;
}

export async function analyzeEmail(
  subject: string,
  body: string,
  from: string,
  companies: string[],
): Promise<EmailAnalysisResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("Groq API key is missing. Please configure it in Settings.");
  }

  const model = getGroqModel();

  const systemPrompt = `You are a recruitment assistant for a job application tracker.
Analyze the email details (Sender, Subject, and Body).
Your task is to determine:
1. If this email is a relevant job application communication (receipt, update, interview, rejection, offer) and NOT marketing/newsletters/spam.
2. If it is a rejection notice (indicating the candidate's application was unsuccessful or not selected).
3. The name of the company. If it matches or is a soft match to one of the tracked companies, return the matched company name from the list.

Tracked Companies:
${companies.map((c) => `- "${c}"`).join("\n")}

Output a valid JSON object ONLY:
{
  "is_relevant": true / false,
  "is_rejection": true / false,
  "company_name": "Matched company name from the list, or the name found in email, or null"
}

Do not include any explanation or markdown formatting. Output raw JSON.`;

  try {
    const response = await fetchWithGroqRetry("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `From: ${from}\nSubject: ${subject}\n\nBody:\n${body.substring(0, 1200)}`, // Limit to 1200 chars to avoid rate limits
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Groq API Error: ${message}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response received from Groq model.");
    }

    return JSON.parse(content) as EmailAnalysisResult;
  } catch (error) {
    console.error("Error in analyzeEmail:", error);
    throw error;
  }
}

export interface BatchedEmailInput {
  id: string;
  subject: string;
  from: string;
  body: string;
}

export interface BatchedEmailAnalysisResult {
  id: string;
  is_relevant: boolean;
  is_rejection: boolean;
  company_name: string | null;
}

export async function analyzeEmailsBatch(
  emails: BatchedEmailInput[],
  companies: string[]
): Promise<BatchedEmailAnalysisResult[]> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("Groq API key is missing. Please configure it in Settings.");
  }

  const model = getGroqModel();

  const systemPrompt = `You are a recruitment assistant for a job application tracker.
Analyze the provided batch of emails. For each email, determine:
1. If the email is a relevant job application communication (receipt, update, interview, rejection, offer) and NOT marketing/newsletters/spam.
2. If it is a rejection notice (indicating the candidate's application was unsuccessful or not selected).
3. The name of the company. If it matches or is a soft match to one of the tracked companies, return the matched company name from the list.

Tracked Companies:
${companies.map((c) => `- "${c}"`).join("\n")}

You must return a valid JSON object containing an array under the key "results".
Each item in the array must have the following format:
{
  "id": "The ID of the email (e.g. 'Mail 1')",
  "is_relevant": true / false,
  "is_rejection": true / false,
  "company_name": "Matched company name from the list, or the name found in email, or null"
}

Example output structure:
{
  "results": [
    { "id": "Mail 1", "is_relevant": true, "is_rejection": true, "company_name": "Google" }
  ]
}

Return ONLY the JSON object. Do not include any explanation or markdown formatting like \`\`\`json ... \`\`\`. Output raw JSON.`;

  const userContent = emails
    .map(
      (email) =>
        `--- BEGIN EMAIL ID: ${email.id} ---\nFrom: ${email.from}\nSubject: ${email.subject}\nBody:\n${email.body}\n--- END EMAIL ID: ${email.id} ---`
    )
    .join("\n\n");

  try {
    const response = await fetchWithGroqRetry("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Please analyze the following emails and return the results as a JSON object with a "results" array:\n\n${userContent}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Groq API Error: ${message}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response received from Groq model.");
    }

    const parsed = JSON.parse(content) as { results: BatchedEmailAnalysisResult[] };
    return parsed.results || [];
  } catch (error) {
    console.error("Error in analyzeEmailsBatch:", error);
    throw error;
  }
}

