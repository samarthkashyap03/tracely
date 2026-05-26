import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, BarChart3, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useJobs } from "@/lib/queries";
import { JobTable } from "@/components/JobTable";
import { JobFormSheet } from "@/components/JobFormSheet";
import { StatsCards } from "@/components/StatsCards";
import { QuickNotes } from "@/components/QuickNotes";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { JobApplication } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: jobs = [], isLoading } = useJobs(user?.id);
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (j: JobApplication) => {
    setEditing(j);
    setOpen(true);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {!isSupabaseConfigured && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Supabase isn't configured yet. Add <code className="font-mono">VITE_SUPABASE_URL</code>{" "}
          and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code>,
          then run the SQL in <code>supabase/schema.sql</code>.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Every role you've applied to, in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/analytics"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card hover:bg-accent/80 px-4 text-sm font-medium text-foreground transition"
          >
            <BarChart3 className="size-4 text-primary" /> Analytics
          </Link>
          <Button variant="outline" onClick={() => setNotesOpen(true)} className="flex items-center gap-2 h-9">
            <StickyNote className="size-4 text-primary" /> Notes
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4" /> Add application
          </Button>
        </div>
      </div>

      <StatsCards jobs={jobs} />

      {isLoading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">Loading…</div>
      ) : (
        <JobTable jobs={jobs} onEdit={openEdit} />
      )}

      <JobFormSheet open={open} onOpenChange={setOpen} editing={editing} />

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <div className="py-4">
            <QuickNotes isEmbed />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
