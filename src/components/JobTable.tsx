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
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(resume.file_path);
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
    } catch (err: any) {
      toast.error(err.message || "Failed to download file");
    }
  };
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const statuses = useMemo(() => Array.from(new Set(jobs.map((j) => j.status))), [jobs]);
  const platforms = useMemo(() => Array.from(new Set(jobs.map((j) => j.platform).filter(Boolean))), [jobs]);

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
      <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pb-1">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, role, platform…"
            className="pl-8 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card/65 px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary min-w-[110px]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card/65 px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary min-w-[110px]"
          >
            <option value="all">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card/65 px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary min-w-[110px]"
          >
            <option value="all">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {(timeFilter !== "all" || statusFilter !== "all" || platformFilter !== "all" || q.trim() !== "") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTimeFilter("all");
                setStatusFilter("all");
                setPlatformFilter("all");
                setQ("");
              }}
              className="h-9 text-xs px-2.5 hover:bg-accent/40"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Work</TableHead>
              <TableHead>Resume</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  {jobs.length === 0 ? "No applications yet. Add your first one." : "No matches."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((j) => (
                <TableRow key={j.id} className="group">
                  <TableCell className="font-medium">
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
                                  className="inline-flex items-center gap-1 hover:text-primary"
                                >
                                  {j.company_name}
                                  <ExternalLink className="size-3 opacity-0 group-hover:opacity-60" />
                                </a>
                              ) : (
                                <span className="hover:text-primary transition-colors">{j.company_name}</span>
                              )}
                              <StickyNote className="size-3.5 text-amber-400 shrink-0 animate-pulse" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-pre-wrap break-words bg-card text-foreground border border-border/80 shadow-md p-3 text-xs rounded-lg">
                            <div className="font-semibold text-primary mb-1 text-[10px] uppercase tracking-wider">Note</div>
                            {j.notes}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        j.url ? (
                          <a
                            href={j.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary"
                          >
                            {j.company_name}
                            <ExternalLink className="size-3 opacity-0 group-hover:opacity-60" />
                          </a>
                        ) : (
                          j.company_name
                        )
                      )}
                    </div>
                    {j.location && (
                      <div className="text-xs text-muted-foreground mt-0.5">{j.location}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{j.role || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={j.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{j.platform || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{j.work_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {j.resume_id ? (
                      (() => {
                        const r = resumes.find((res) => res.id === j.resume_id);
                        if (!r) return "—";
                        return (
                          <button
                            onClick={() => downloadResume(r.id, r.name)}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors text-xs bg-accent/40 hover:bg-accent/80 px-2 py-1 rounded max-w-[120px] text-foreground font-medium"
                            title={`Download ${r.name}`}
                          >
                            <FileText className="size-3.5 shrink-0 text-primary" />
                            <span className="truncate">{r.name}</span>
                          </button>
                        );
                      })()
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground"
                    title={format(new Date(j.applied_at), "PPpp")}
                  >
                    {format(new Date(j.applied_at), "dd/MM/yy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(j)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmId(j.id)}>
                        <Trash2 className="size-4 text-destructive" />
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


