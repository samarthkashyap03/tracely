import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  applied: "bg-info/15 text-info border-info/30",
  "under process": "bg-warning/15 text-warning border-warning/30",
  interview: "bg-primary/15 text-primary border-primary/30",
  offer: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  const cls = map[key] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cls,
        className
      )}
    >
      {status}
    </span>
  );
}
