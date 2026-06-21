import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  applied: "bg-info/10 text-info border-info/20",
  "under process": "bg-warning/10 text-warning border-warning/20",
  interview: "bg-primary/10 text-primary border-primary/20",
  offer: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const dotColors: Record<string, string> = {
  applied: "bg-info",
  "under process": "bg-warning animate-pulse",
  interview: "bg-primary",
  offer: "bg-success shadow-lg shadow-success",
  rejected: "bg-destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  const cls = map[key] ?? "bg-muted text-muted-foreground border-border";
  const dotCls = dotColors[key] ?? "bg-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300",
        cls,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", dotCls)} />
      {status}
    </span>
  );
}
