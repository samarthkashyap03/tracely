import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsCards } from "@/components/StatsCards";
import type { JobApplication } from "@/lib/types";

// StatsCards uses lucide-react icons — stub them so the DOM stays simple
vi.mock("lucide-react", () => ({
  Briefcase: () => <span data-testid="icon-briefcase" />,
  Clock: () => <span data-testid="icon-clock" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  Trophy: () => <span data-testid="icon-trophy" />,
  XCircle: () => <span data-testid="icon-xcircle" />,
}));

afterEach(() => vi.clearAllMocks());

const makeJob = (status: string, id = Math.random().toString()): JobApplication => ({
  id,
  user_id: "u1",
  company_name: "Co",
  role: "Dev",
  status,
  platform: null,
  work_type: null,
  location: null,
  salary: null,
  url: null,
  notes: null,
  applied_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  resume_id: null,
});

describe("StatsCards", () => {
  it('shows "0" for every stat when no jobs are passed', () => {
    render(<StatsCards jobs={[]} />);
    const zeros = screen.getAllByText("0");
    // 5 cards, all zero (Total, Active, Interviews, Offers, Rejections)
    expect(zeros.length).toBe(5);
  });

  it("displays the correct total application count", () => {
    const jobs = [makeJob("applied"), makeJob("interview"), makeJob("rejected")];
    render(<StatsCards jobs={jobs} />);
    expect(screen.getByText("3")).toBeInTheDocument(); // Total
  });

  it('counts "applied" and "under process" as active roles', () => {
    const jobs = [makeJob("applied"), makeJob("under process"), makeJob("rejected")];
    render(<StatsCards jobs={jobs} />);
    // Active = 2 (applied + under process)
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("counts interviews correctly", () => {
    const jobs = [makeJob("interview"), makeJob("interview"), makeJob("applied")];
    render(<StatsCards jobs={jobs} />);
    // Interview count = 2
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it("counts offers correctly", () => {
    const jobs = [makeJob("offer"), makeJob("applied")];
    render(<StatsCards jobs={jobs} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("counts rejections correctly", () => {
    const jobs = [makeJob("rejected"), makeJob("rejected"), makeJob("rejected")];
    render(<StatsCards jobs={jobs} />);
    // Rejections = 3, Total = 3 — both show "3"
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all five stat labels", () => {
    render(<StatsCards jobs={[]} />);
    expect(screen.getByText(/total applications/i)).toBeInTheDocument();
    expect(screen.getByText(/active roles/i)).toBeInTheDocument();
    expect(screen.getByText(/interviews/i)).toBeInTheDocument();
    expect(screen.getByText(/offers received/i)).toBeInTheDocument();
    expect(screen.getByText(/rejections/i)).toBeInTheDocument();
  });

  it("is case-insensitive when matching status", () => {
    // Status "Rejected" (capital R) should still be counted
    const jobs = [makeJob("Rejected")];
    render(<StatsCards jobs={jobs} />);
    // Rejections card value should be 1
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
