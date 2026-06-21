import type { JobApplication } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Briefcase, Clock, Sparkles, Trophy, XCircle } from "lucide-react";

export function StatsCards({ jobs }: { jobs: JobApplication[] }) {
  const by = (s: string) => jobs.filter((j) => j.status.toLowerCase() === s).length;
  const items = [
    {
      label: "Total Applications",
      value: jobs.length,
      icon: Briefcase,
      borderClass: "border-l-4 border-l-muted-foreground/30",
      bgClass: "bg-muted-foreground/5",
      iconColor: "text-muted-foreground",
    },
    {
      label: "Active Roles",
      value: by("applied") + by("under process"),
      icon: Clock,
      borderClass: "border-l-4 border-l-blue-500/70",
      bgClass: "bg-blue-500/5",
      iconColor: "text-blue-500",
    },
    {
      label: "Interviews",
      value: by("interview"),
      icon: Sparkles,
      borderClass: "border-l-4 border-l-indigo-500/70",
      bgClass: "bg-indigo-500/5",
      iconColor: "text-indigo-500",
    },
    {
      label: "Offers Received",
      value: by("offer"),
      icon: Trophy,
      borderClass: "border-l-4 border-l-emerald-500/70",
      bgClass: "bg-emerald-500/5",
      iconColor: "text-emerald-500",
    },
    {
      label: "Rejections",
      value: by("rejected"),
      icon: XCircle,
      borderClass: "border-l-4 border-l-rose-500/70",
      bgClass: "bg-rose-500/5",
      iconColor: "text-rose-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {items.map((s) => (
        <Card
          key={s.label}
          className={`p-5 bg-card/40 border border-border/40 ${s.borderClass} ${s.bgClass} hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-card/10 group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </span>
            <s.icon className={`size-4 ${s.iconColor} group-hover:scale-110 transition-transform duration-300`} />
          </div>
          <div className="mt-2.5 text-3xl font-bold tracking-tight text-foreground">{s.value}</div>
          
          {/* Subtle background glow effect */}
          <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-foreground/5 group-hover:bg-foreground/10 blur-xl transition-all duration-300" />
        </Card>
      ))}
    </div>
  );
}
