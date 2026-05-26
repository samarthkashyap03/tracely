import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, ExternalLink, Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { JobApplication } from "@/lib/types";
import { useDeleteJob } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Props {
  jobs: JobApplication[];
  onEdit: (j: JobApplication) => void;
}

export function JobTable({ jobs, onEdit }: Props) {
  const { user } = useAuth();
  const del = useDeleteJob(user?.id);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const statuses = useMemo(() => Array.from(new Set(jobs.map((j) => j.status))), [jobs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter && j.status !== statusFilter) return false;
      if (!needle) return true;
      return [j.company_name, j.role, j.platform, j.location].filter(Boolean).some((v) =>
        v!.toLowerCase().includes(needle)
      );
    });
  }, [jobs, q, statusFilter]);

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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, role, platform…" className="pl-8" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={statusFilter === null} onClick={() => setStatusFilter(null)}>All</FilterChip>
          {statuses.map((s) => (
            <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</FilterChip>
          ))}
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
              <TableHead>Applied</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  {jobs.length === 0 ? "No applications yet. Add your first one." : "No matches."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((j) => (
                <TableRow key={j.id} className="group">
                  <TableCell className="font-medium">
                    {j.url ? (
                      <a href={j.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                        {j.company_name}
                        <ExternalLink className="size-3 opacity-0 group-hover:opacity-60" />
                      </a>
                    ) : (
                      j.company_name
                    )}
                    {j.location && <div className="text-xs text-muted-foreground">{j.location}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{j.role || "—"}</TableCell>
                  <TableCell><StatusBadge status={j.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{j.platform || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{j.work_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground" title={format(new Date(j.applied_at), "PPpp")}>
                    {formatDistanceToNow(new Date(j.applied_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(j)}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmId(j.id)}><Trash2 className="size-4 text-destructive" /></Button>
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
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs transition " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50")
      }
    >
      {children}
    </button>
  );
}
