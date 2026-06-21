import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, ExternalLink, Search, FileText, StickyNote } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { JobApplication } from "@/lib/types";
import { useDeleteJob, useResumes } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Props {
  jobs: JobApplication[];
  onEdit: (j: JobApplication) => void;
}

export function JobTable({ jobs, onEdit }: Props) {
  const { user } = useAuth();
  const del = useDeleteJob(user?.id);
  const { data: resumes = [] } = useResumes(user?.id);
  const [q, setQ] = useState("");

  const downloadResume = async (resumeId: string, fileName: string) => {
    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume) {
      toast.error("Resume details not found");
      return;
    }
    try {
      const toastId = toast.loading(`Downloading "${fileName}"...`);
      const { data, error } = await supabase.storage.from("resumes").download(resume.file_path);
      toast.dismiss(toastId);

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to download file");
    }
  };
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const statuses = useMemo(() => Array.from(new Set(jobs.map((j) => j.status))), [jobs]);
  const platforms = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.platform).filter((p): p is string => !!p))),
    [jobs],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      // Search text filter
      if (needle) {
        const matchesSearch = [j.company_name, j.role, j.platform, j.location]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && j.status !== statusFilter) return false;

      // Platform filter
      if (platformFilter !== "all" && j.platform !== platformFilter) return false;

      // Time filter
      if (timeFilter !== "all") {
        const appliedTime = new Date(j.applied_at).getTime();
        const nowTime = new Date().getTime();
        const timeDiff = nowTime - appliedTime;

        if (timeFilter === "today") {
          const isToday = new Date(j.applied_at).toDateString() === new Date().toDateString();
          if (!isToday) return false;
        } else if (timeFilter === "week") {
          if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (timeFilter === "month") {
          if (timeDiff > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [jobs, q, statusFilter, platformFilter, timeFilter]);

  const onConfirmDelete = async () => {
    if (!confirmId) return;
    try {
      await del.mutateAsync(confirmId);
      toast.success("Deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pb-1">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, role, platform…"
              className="pl-9 h-9 rounded-lg border-border/60 bg-background/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
            />
          </div>
          <div className="flex flex-wrap gap-2.5 items-center">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/60 bg-background/50 hover:bg-background/80 hover:border-border px-3 py-1 text-xs text-foreground font-medium transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary min-w-[120px]"
            >
              <option value="all">📅 All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/60 bg-background/50 hover:bg-background/80 hover:border-border px-3 py-1 text-xs text-foreground font-medium transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary min-w-[120px]"
            >
              <option value="all">🎯 All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/60 bg-background/50 hover:bg-background/80 hover:border-border px-3 py-1 text-xs text-foreground font-medium transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary min-w-[120px]"
            >
              <option value="all">💻 All Platforms</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {(timeFilter !== "all" ||
              statusFilter !== "all" ||
              platformFilter !== "all" ||
              q.trim() !== "") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTimeFilter("all");
                  setStatusFilter("all");
                  setPlatformFilter("all");
                  setQ("");
                }}
                className="h-9 text-xs px-3 hover:bg-accent/40 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Premium Table Container */}
        <div className="rounded-xl border border-border/40 bg-card/20 backdrop-blur-xs overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-300">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider">Company</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider">Role</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider">Platform</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider">Work Type</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider">Resume</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider">Applied On</TableHead>
                <TableHead className="py-3.5 font-semibold text-foreground text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic">
                    {jobs.length === 0 ? "No applications tracked yet. Click 'Add application' to start!" : "No job applications match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((j) => (
                  <TableRow key={j.id} className="group border-b border-border/30 odd:bg-card/15 even:bg-accent/5 hover:bg-accent/25 transition-all duration-200">
                    <TableCell className="py-3.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        {j.notes && j.notes.trim() ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1.5 cursor-help">
                                {j.url ? (
                                  <a
                                    href={j.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 hover:text-primary transition-colors text-foreground"
                                  >
                                    {j.company_name}
                                    <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                ) : (
                                  <span className="hover:text-primary transition-colors text-foreground">
                                    {j.company_name}
                                  </span>
                                )}
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors">
                                  <StickyNote className="size-3" />
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs whitespace-pre-wrap break-words bg-card text-foreground border border-border/80 shadow-md p-3 text-xs rounded-lg">
                              <div className="font-semibold text-primary mb-1 text-[10px] uppercase tracking-wider">
                                Application Note
                              </div>
                              {j.notes}
                            </TooltipContent>
                          </Tooltip>
                        ) : j.url ? (
                          <a
                            href={j.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors text-foreground"
                          >
                            {j.company_name}
                            <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <span className="text-foreground">{j.company_name}</span>
                        )}
                      </div>
                      {j.location && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{j.location}</div>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-foreground/80">{j.role || "—"}</TableCell>
                    <TableCell className="py-3.5">
                      <StatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">{j.platform || "—"}</TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">
                      {j.work_type ? (
                        <span className="text-xs bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/20 text-muted-foreground font-medium">
                          {j.work_type}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">
                      {j.resume_id
                        ? (() => {
                            const r = resumes.find((res) => res.id === j.resume_id);
                            if (!r) return "—";
                            return (
                              <button
                                onClick={() => downloadResume(r.id, r.name)}
                                className="inline-flex items-center gap-1.5 hover:text-primary transition-all text-[11px] bg-accent/40 hover:bg-accent/80 border border-border/40 px-2.5 py-1 rounded-md max-w-[125px] text-foreground font-medium"
                                title={`Download ${r.name}`}
                              >
                                <FileText className="size-3.5 shrink-0 text-primary" />
                                <span className="truncate">{r.name}</span>
                              </button>
                            );
                          })()
                        : "—"}
                    </TableCell>
                    <TableCell
                      className="py-3.5 text-muted-foreground"
                      title={format(new Date(j.applied_at), "PPpp")}
                    >
                      {format(new Date(j.applied_at), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="py-3.5 text-right">
                      <div className="inline-flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => onEdit(j)} className="size-8 hover:bg-accent/80 rounded-md">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmId(j.id)} className="size-8 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-md">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete application?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
