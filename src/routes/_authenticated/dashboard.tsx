import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, BarChart3, StickyNote, Download, Info, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useJobs } from "@/lib/queries";
import { JobTable } from "@/components/JobTable";
import { JobFormSheet } from "@/components/JobFormSheet";
import { StatsCards } from "@/components/StatsCards";
import { QuickNotes } from "@/components/QuickNotes";
import { GmailAgentCard } from "@/components/GmailAgentCard";
import { isSupabaseConfigured } from "@/lib/supabase";
import { handleOAuthRedirect } from "@/lib/gmailService";
import type { JobApplication } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generateJobLogMarkdown } from "@/lib/logUtils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: jobs = [], isLoading } = useJobs(user?.id);
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<
    Array<{ id: string; company_name: string; role: string | null; updated_at: string }>
  >([]);

  useEffect(() => {
    // Check if OAuth redirect was triggered
    const oauthFound = handleOAuthRedirect();
    if (oauthFound) {
      toast.success("Gmail connected successfully!");
    }

    // Load recent updates from localStorage
    const saved = localStorage.getItem("tracely_recent_updates");
    if (saved) {
      try {
        setRecentUpdates(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse recent updates", err);
      }
    }
  }, []);

  const handleScanComplete = () => {
    const saved = localStorage.getItem("tracely_recent_updates");
    if (saved) {
      try {
        setRecentUpdates(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to reload recent updates", err);
      }
    }
  };

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (j: JobApplication) => {
    setEditing(j);
    setOpen(true);
  };

  const handleDownloadLog = () => {
    if (jobs.length === 0) {
      toast.error("No applications to download");
      return;
    }
    try {
      const markdown = generateJobLogMarkdown(jobs);
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `job_applications_log_${new Date().toISOString().slice(0, 10)}.md`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Job log downloaded successfully!");
    } catch (error) {
      console.error("Failed to download log:", error);
      toast.error("Failed to download job log");
    }
  };

  const handleCopyLogToClipboard = async () => {
    if (jobs.length === 0) {
      toast.error("No applications to copy");
      return;
    }
    try {
      const markdown = generateJobLogMarkdown(jobs);
      await navigator.clipboard.writeText(markdown);
      toast.success("AI-ready job log copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy log:", error);
      toast.error("Failed to copy job log to clipboard");
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/analytics"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card hover:bg-accent/80 px-4 text-sm font-medium text-foreground transition"
          >
            <BarChart3 className="size-4 text-primary" /> Analytics
          </Link>
          <Button
            variant="outline"
            onClick={() => setNotesOpen(true)}
            className="flex items-center gap-2 h-9"
          >
            <StickyNote className="size-4 text-primary" /> Notes
          </Button>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              onClick={handleDownloadLog}
              className="flex items-center gap-2 h-9"
              disabled={jobs.length === 0}
            >
              <Download className="size-4 text-primary" /> Download Log
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 p-0 flex items-center justify-center"
                  aria-label="About Download Log feature"
                >
                  <Info className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 border border-border/80 bg-card text-card-foreground shadow-lg rounded-xl">
                <div className="space-y-2.5">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Info className="size-4 text-primary" /> AI Analytics Log
                  </h4>
                  <p className="text-xs text-muted-foreground leading-normal">
                    This feature formats your complete job search history into a structured Markdown
                    table pre-configured with a custom AI prompt.
                  </p>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Simply download the log file or copy it using the button below, then paste it
                    directly into ChatGPT, Claude, Gemini, or other AI systems to analyze your
                    response rates, platforms, and get career strategy advice.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs flex items-center justify-center gap-1.5 h-8 mt-1"
                    onClick={handleCopyLogToClipboard}
                    disabled={jobs.length === 0}
                  >
                    <Copy className="size-3.5" /> Copy Log to Clipboard
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={openNew}>
            <Plus className="size-4" /> Add application
          </Button>
        </div>
      </div>

      <StatsCards jobs={jobs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            <div className="grid place-items-center py-20 text-muted-foreground">Loading…</div>
          ) : (
            <JobTable jobs={jobs} onEdit={openEdit} />
          )}
        </div>

        <div className="space-y-6">
          <GmailAgentCard autoTrigger={true} onScanComplete={handleScanComplete} />

          {recentUpdates.length > 0 && (
            <Card className="p-5 bg-card/60 border border-border/60 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle className="size-4 text-emerald-500" />
                Recently Updated by Agent
              </h3>
              <div className="divide-y divide-border/40">
                {recentUpdates.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{item.company_name}</div>
                      <div className="text-muted-foreground">{item.role || "Role"}</div>
                    </div>
                    <span className="bg-destructive/15 text-destructive border border-destructive/30 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      Status: Rejected
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  localStorage.removeItem("tracely_recent_updates");
                  setRecentUpdates([]);
                }}
              >
                Clear History
              </Button>
            </Card>
          )}
        </div>
      </div>

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
