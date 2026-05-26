import type { JobApplication } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Briefcase, Clock, Sparkles, Trophy, XCircle } from "lucide-react";

export function StatsCards({ jobs }: { jobs: JobApplication[] }) {
  const by = (s: string) => jobs.filter((j) => j.status.toLowerCase() === s).length;
  const items = [
    { label: "Total", value: jobs.length, icon: Briefcase, tone: "text-foreground" },
    { label: "Active", value: by("applied") + by("under process"), icon: Clock, tone: "text-info" },
    { label: "Interview", value: by("interview"), icon: Sparkles, tone: "text-primary" },
    { label: "Offer", value: by("offer"), icon: Trophy, tone: "text-success" },
    { label: "Rejected", value: by("rejected"), icon: XCircle, tone: "text-destructive" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((s) => (
        <Card key={s.label} className="p-4 bg-card/60 border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {s.label}
            </span>
            <s.icon className={`size-4 ${s.tone}`} />
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</div>
        </Card>
      ))}
    </div>
  );
}
