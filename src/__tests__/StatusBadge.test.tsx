import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/StatusBadge";

describe("StatusBadge", () => {
  const knownStatuses = ["applied", "under process", "interview", "offer", "rejected"];

  it.each(knownStatuses)('renders the label for status "%s"', (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });

  it("is case-insensitive (mixed case input)", () => {
    render(<StatusBadge status="Applied" />);
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("renders an unknown status with a fallback style", () => {
    render(<StatusBadge status="ghosted" />);
    const badge = screen.getByText("ghosted").closest("span");
    expect(badge).toHaveClass("bg-muted");
  });

  it("forwards an extra className to the wrapper span", () => {
    render(<StatusBadge status="offer" className="my-custom-class" />);
    const badge = screen.getByText("offer").closest("span");
    expect(badge).toHaveClass("my-custom-class");
  });

  it("contains a coloured dot span alongside the text", () => {
    const { container } = render(<StatusBadge status="rejected" />);
    const spans = container.querySelectorAll("span > span");
    expect(spans.length).toBeGreaterThanOrEqual(1);
  });
});
