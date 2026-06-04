import type { JobApplication } from "./types";

/**
 * Formats job applications into an AI-analytics friendly markdown text format.
 * Includes a predefined analytics prompt followed by a structured markdown table of the applications.
 */
export function generateJobLogMarkdown(jobs: JobApplication[]): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const promptHeader = `
# TRACELY JOB SEARCH LOG & AI ANALYTICS PROMPT
Generated on: ${dateStr}
Total Applications: ${jobs.length}

## How to use:
Copy the entire contents of this text and paste it into any AI model (e.g. ChatGPT, Claude, Gemini, DeepSeek).

---
AI Analytics Request:
"Analyze my job application log below. Please provide a detailed report including:
1. Status Funnel Analysis: Show progression rates (e.g. total applications, interviews, offers, rejections) and my response rate.
2. Platform Performance: Which sites/platforms are yielding the best results?
3. Work Types & Roles: Compare application success between Remote/Hybrid/Onsite and different roles.
4. Qualitative Sentiment: Synthesize patterns, themes, or common traits from the 'Notes' column.
5. Actionable Recommendations: What should I change in my resume, strategy, or application volume to optimize my job search?"

Job Application Data:
| Company | Role | Status | Platform | Work Type | Location | Salary | Applied Date | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  const rows = jobs
    .map((j) => {
      const company = j.company_name || "—";
      const role = j.role || "—";
      const status = j.status || "—";
      const platform = j.platform || "—";
      const workType = j.work_type || "—";
      const location = j.location || "—";
      const salary = j.salary || "—";
      const date = j.applied_at ? new Date(j.applied_at).toLocaleDateString() : "—";
      // Sanitize notes: replace newlines with spaces and escape vertical bars so they don't break the markdown table format
      const notes = j.notes ? j.notes.replace(/\r?\n/g, " ").replace(/\|/g, "\\|") : "—";

      return `| ${company} | ${role} | ${status} | ${platform} | ${workType} | ${location} | ${salary} | ${date} | ${notes} |`;
    })
    .join("\n");

  return `${promptHeader.trim()}\n${rows}\n---`;
}
