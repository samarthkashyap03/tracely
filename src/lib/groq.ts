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
    const localKey = localStorage.getItem(API_KEY_KEY);
    if (localKey) return localKey;
  }
  return (import.meta.env.VITE_GROQ_API_KEY as string) || "";
}

export function setGroqApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(API_KEY_KEY, key.trim());
  }
}

export function clearGroqApiKey() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(API_KEY_KEY);
  }
}

export function getGroqModel(): string {
  if (typeof window !== "undefined") {
    const model = localStorage.getItem(MODEL_KEY);
    if (model) return model;
  }
  return DEFAULT_GROQ_MODEL;
}

export function setGroqModel(model: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MODEL_KEY, model.trim());
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
