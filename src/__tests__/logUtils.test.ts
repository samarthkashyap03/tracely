import { describe, it, expect } from "vitest";
import { generateJobLogMarkdown } from "@/lib/logUtils";
import type { JobApplication } from "@/lib/types";

const makeJob = (overrides: Partial<JobApplication> = {}): JobApplication => ({
  id: "job-1",
  user_id: "user-1",
  company_name: "Acme Corp",
  role: "Frontend Developer",
  status: "applied",
  platform: "LinkedIn",
  work_type: "Remote",
  location: "Berlin, Germany",
  salary: "€80k-€100k",
  url: "https://acme.com/jobs/1",
  notes: "* React 18\n* TypeScript required",
  applied_at: "2026-01-15T10:00:00Z",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  resume_id: null,
  ...overrides,
});

describe("generateJobLogMarkdown", () => {
  it("includes the total application count in the header", () => {
    const jobs = [makeJob(), makeJob({ id: "job-2", company_name: "Beta Ltd" })];
    const md = generateJobLogMarkdown(jobs);
    expect(md).toContain("Total Applications: 2");
  });

  it("contains a markdown table row for each job", () => {
    const md = generateJobLogMarkdown([makeJob()]);
    expect(md).toContain("Acme Corp");
    expect(md).toContain("Frontend Developer");
    expect(md).toContain("LinkedIn");
    expect(md).toContain("Remote");
    expect(md).toContain("Berlin, Germany");
    expect(md).toContain("€80k-€100k");
  });

  it("renders '—' for null optional fields", () => {
    const md = generateJobLogMarkdown([makeJob({ role: null, platform: null, salary: null })]);
    // At least one "—" for each missing field
    const dashes = (md.match(/—/g) || []).length;
    expect(dashes).toBeGreaterThanOrEqual(3);
  });

  it("sanitizes pipe characters in notes to avoid breaking the table", () => {
    const md = generateJobLogMarkdown([makeJob({ notes: "foo | bar | baz" })]);
    // Pipes inside notes should be escaped
    expect(md).toContain("foo \\| bar \\| baz");
  });

  it("sanitizes newlines in notes", () => {
    const md = generateJobLogMarkdown([makeJob({ notes: "line1\nline2\r\nline3" })]);
    // Notes column should have no raw newlines
    const notesRow = md.split("\n").find((l) => l.includes("Acme Corp"));
    expect(notesRow).not.toBeUndefined();
    expect(notesRow).not.toContain("\n");
  });

  it("produces a valid markdown table (pipe-separated)", () => {
    const md = generateJobLogMarkdown([makeJob()]);
    const rows = md.split("\n").filter((l) => l.startsWith("|"));
    // Header row + at least one data row
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row.endsWith("|")).toBe(true);
    }
  });

  it("handles an empty jobs array gracefully", () => {
    const md = generateJobLogMarkdown([]);
    expect(md).toContain("Total Applications: 0");
  });

  it("ends with the closing delimiter", () => {
    const md = generateJobLogMarkdown([makeJob()]);
    expect(md.trim().endsWith("---")).toBe(true);
  });
});
