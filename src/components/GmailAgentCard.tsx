import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  ShieldCheck,
  Play,
  RefreshCw,
  XCircle,
  CheckCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  initiateGmailLogin,
  isGmailConnected,
  disconnectGmail,
  getEmailConsent,
  setEmailConsent,
  fetchRecentEmails,
  getScanLookbackDays,
  setScanLookbackDays,
  getGmailAccessToken,
} from "@/lib/gmailService";
import { analyzeEmail } from "@/lib/groq";
import { useJobs, useUpdateJob } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { JobApplication } from "@/lib/types";

export function GmailAgentCard({
  onScanComplete,
  autoTrigger = false,
}: {
  onScanComplete?: (updatedJobs: JobApplication[]) => void;
  autoTrigger?: boolean;
}) {
  const { user } = useAuth();
  const { data: jobs = [] } = useJobs(user?.id);
  const updateJob = useUpdateJob(user?.id);

  const [connected, setConnected] = useState(false);
  const [consent, setConsent] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [hasAutoScanned, setHasAutoScanned] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(1);

  const handleConsentToggle = (checked: boolean) => {
    setEmailConsent(checked);
    setConsent(checked);
    if (!checked) {
      disconnectGmail();
      setConnected(false);
      toast.info("Gmail integration disconnected and consent revoked.");
    }
  };

  const handleConnect = () => {
    try {
      initiateGmailLogin();
    } catch (e) {
      toast.error("Failed to redirect to Google Login.");
    }
  };

  const handleDisconnect = () => {
    disconnectGmail();
    setConnected(false);
    setConsent(false);
    toast.info("Gmail account disconnected.");
  };

  const handleLookbackChange = (val: number) => {
    setScanLookbackDays(val);
    setLookbackDays(val);
    toast.success(`Scan lookback period set to ${val} day${val > 1 ? "s" : ""}.`);
  };

  // Helper for fuzzy string matching between LLM company name and local job applications
  const findMatchingJob = useCallback(
    (llmCompanyName: string): JobApplication | undefined => {
      if (!llmCompanyName) return undefined;
      const cleanLlmName = llmCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Try exact match first (case-insensitive)
      const exactMatch = jobs.find(
        (j) => j.company_name.toLowerCase() === llmCompanyName.toLowerCase(),
      );
      if (exactMatch) return exactMatch;

      // Try soft inclusion matching:
      // e.g. "Google" in "Google LLC" or "Google LLC" contains "Google"
      return jobs.find((j) => {
        const cleanJobName = j.company_name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanJobName.includes(cleanLlmName) || cleanLlmName.includes(cleanJobName);
      });
    },
    [jobs],
  );

  const handleScan = useCallback(async () => {
    if (!consent || !connected) {
      toast.error("Please connect Gmail and grant access permission first.");
      return;
    }

    const token = getGmailAccessToken();
    if (!token) {
      toast.error("Gmail session expired. Please connect again.");
      setConnected(false);
      return;
    }

    setScanning(true);
    setScanLog(["Starting scan...", "Fetching recent emails..."]);

    try {
      const activeJobs = jobs.filter((j) => {
        const status = j.status.toLowerCase();
        return status === "applied" || status === "under process";
      });
      const companyNames = activeJobs.map((j) => j.company_name);

      if (companyNames.length === 0) {
        setScanLog((prev) => [
          ...prev,
          "No active job applications (Applied or Under Process) found to scan for.",
        ]);
        setScanning(false);
        return;
      }

      const lookback = getScanLookbackDays();
      const emails = await fetchRecentEmails(token, lookback);
      setScanLog((prev) => [
        ...prev,
        `Retrieved ${emails.length} emails from the past ${lookback} day(s).`,
        "Filtering emails for job-related keywords or tracked companies...",
      ]);

      const jobKeywords = [
        // English
        "application", "apply", "applied", "job", "career", "position", "role", "interview", "resume", "cv",
        "hiring", "thank you for", "unsuccessful", "unfortunately", "status", "candidate", "recruitment",
        "recruiting", "talent", "offer", "update", "feedback", "assessment", "regret", "declined",
        // German
        "bewerbung", "stelle", "karriere", "gespräch", "vorstellung", "rückmeldung", "absage", "angebot", 
        "vielen dank", "unterlagen", "auswahlverfahren", "kandidat",
        // French
        "candidature", "poste", "entretien", "offre", "retour", "refus", "statut", "recrutement",
        // Spanish / Italian
        "candidatura", "puesto", "entrevista", "oferta", "rechazo", "estado", "proceso"
      ];

      const candidateEmails = emails.filter((email) => {
        const lowerSubject = email.subject.toLowerCase();
        const lowerSnippet = email.snippet.toLowerCase();
        const lowerFrom = email.from.toLowerCase();

        // Check if any active company name is mentioned
        const mentionsCompany = companyNames.some((comp) => {
          const cleanComp = comp.toLowerCase().trim();
          if (!cleanComp) return false;
          return (
            lowerSubject.includes(cleanComp) ||
            lowerSnippet.includes(cleanComp) ||
            lowerFrom.includes(cleanComp)
          );
        });

        // Check if any job keywords are in subject or sender
        const hasJobKeyword = jobKeywords.some(
          (kw) => lowerSubject.includes(kw) || lowerFrom.includes(kw)
        );

        return mentionsCompany || hasJobKeyword;
      });

      setScanLog((prev) => [
        ...prev,
        `Identified ${candidateEmails.length} potential job-related emails to analyze out of ${emails.length}.`,
      ]);

      const updatedJobsList: JobApplication[] = [];

      for (let idx = 0; idx < candidateEmails.length; idx++) {
        const email = candidateEmails[idx];
        setScanLog((prev) => [...prev, `Analyzing email: "${email.subject}"...`]);

        // Add a small delay between LLM calls to prevent rate limiting, except for the first one
        if (idx > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        try {
          const result = await analyzeEmail(email.subject, email.body, email.from, companyNames);

          if (!result.is_relevant) {
            setScanLog((prev) => [...prev, `✓ Skipped: Unrelated to job applications.`]);
            continue;
          }

          if (result.is_rejection && result.company_name) {
            const matchedJob = findMatchingJob(result.company_name);

            if (matchedJob) {
              const currentStatus = matchedJob.status.toLowerCase();

              // Safe Check: "if the user has already changed the status, then not touch it."
              if (currentStatus !== "applied" && currentStatus !== "under process") {
                setScanLog((prev) => [
                  ...prev,
                  `⚠️ Match found for "${matchedJob.company_name}", but status is already "${matchedJob.status}" (manually updated). Keeping current status.`,
                ]);
                continue;
              }

              setScanLog((prev) => [
                ...prev,
                `❌ Identified rejection for "${matchedJob.company_name}" (mapped from LLM output "${result.company_name}").`,
              ]);

              // Update the status of this job application in Supabase
              const updated = await updateJob.mutateAsync({
                id: matchedJob.id,
                status: "Rejected",
              });

              updatedJobsList.push(updated);
            } else {
              setScanLog((prev) => [
                ...prev,
                `⚠️ Email classified as rejection for "${result.company_name}", but no matching active job application was found.`,
              ]);
            }
          } else {
            setScanLog((prev) => [...prev, `✓ Email parsed: Not a rejection (relevant update/interview/receipt).`]);
          }
        } catch (err: unknown) {
          // "IF the analysis fail, it should not change or edit any data."
          const msg = err instanceof Error ? err.message : "Unknown error";
          setScanLog((prev) => [
            ...prev,
            `⚠️ Failed to analyze email "${email.subject}": ${msg}. Data untouched.`,
          ]);
        }
      }

      const changesSummary = updatedJobsList.map(
        (job) => `➔ ${job.company_name} (${job.role || "Role"}) status updated to Rejected`
      );

      setScanLog((prev) => [
        ...prev,
        "Scan complete!",
        ...(changesSummary.length > 0
          ? ["", "📈 Status Changes Made:", ...changesSummary]
          : ["", "➔ No job application statuses were updated."]),
      ]);

      if (updatedJobsList.length > 0) {
        toast.success(`Successfully updated ${updatedJobsList.length} applications to 'Rejected'!`);

        // Save these recently updated jobs to localStorage for dashboard display
        const existingRecentStr = localStorage.getItem("tracely_recent_updates");
        let existingRecent: Array<{
          id: string;
          company_name: string;
          role: string | null;
          updated_at: string;
        }> = [];
        if (existingRecentStr) {
          try {
            existingRecent = JSON.parse(existingRecentStr);
          } catch (err) {
            console.error("Failed to parse existing recent updates", err);
          }
        }

        const newRecent = [
          ...updatedJobsList.map((job) => ({
            id: job.id,
            company_name: job.company_name,
            role: job.role,
            updated_at: new Date().toISOString(),
          })),
          ...existingRecent,
        ].slice(0, 10); // Keep last 10 updates

        localStorage.setItem("tracely_recent_updates", JSON.stringify(newRecent));

        if (onScanComplete) {
          onScanComplete(updatedJobsList);
        }
      } else {
        toast.info("Scan completed. No new rejections found.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Email scan failed: ${msg}`);
      setScanLog((prev) => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setScanning(false);
    }
  }, [consent, connected, jobs, findMatchingJob, updateJob, onScanComplete]);

  useEffect(() => {
    setConnected(isGmailConnected());
    setConsent(getEmailConsent());
    setLookbackDays(getScanLookbackDays());
  }, []);

  useEffect(() => {
    if (autoTrigger && connected && consent && jobs.length > 0 && !hasAutoScanned && !scanning) {
      setHasAutoScanned(true);
      handleScan();
    }
  }, [autoTrigger, connected, consent, jobs, hasAutoScanned, scanning, handleScan]);

  return (
    <Card className="p-6 bg-card/60 border border-border/60 space-y-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Mail className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              Automated Email Scanning Agent
            </h2>
            <p className="text-xs text-muted-foreground">
              Authorize the agent to read your Gmail and automatically update job statuses based on
              HR notifications.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border/60 rounded-lg p-4 bg-accent/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" />
              Enable Email Agent Consent
            </label>
            <p className="text-xs text-muted-foreground max-w-md">
              Allow the agent to securely browse your Gmail inbox in a read-only manner.
            </p>
          </div>
          <Switch checked={consent} onCheckedChange={handleConsentToggle} />
        </div>

        {consent && (
          <div className="space-y-4 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Scan Lookback Range
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Look back at emails received within the selected days.
                </p>
              </div>
              <select
                value={lookbackDays}
                onChange={(e) => handleLookbackChange(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary min-w-[120px]"
              >
                <option value={1}>Today Only</option>
                <option value={3}>Past 3 Days</option>
                <option value={7}>Past 7 Days</option>
                <option value={14}>Past 14 Days</option>
              </select>
            </div>

            {!connected && (
              <div className="text-[11px] leading-normal text-amber-500/90 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                ⚠️ <strong>Portfolio Sandbox Mode</strong>: Because this is a personal project,
                Google will show an "Unverified App" warning during login. You can safely connect by
                clicking <strong>"Advanced"</strong> &rarr;{" "}
                <strong>"Go to tracely.me (unsafe)"</strong>. Rest assured, your credentials are
                kept strictly private on your browser and all processing is client-side.
              </div>
            )}

            <div className="pt-2 border-t border-border/20 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`size-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
                />
                <span className="text-xs font-medium text-foreground">
                  {connected ? "Gmail Connected" : "Gmail Disconnected"}
                </span>
              </div>

              <div className="flex gap-2">
                {!connected ? (
                  <Button size="sm" onClick={handleConnect} className="text-xs h-8">
                    Connect Gmail Account
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleScan}
                      disabled={scanning}
                      className="text-xs h-8 flex items-center gap-1.5"
                    >
                      {scanning ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      Scan Now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDisconnect}
                      className="text-xs h-8 text-muted-foreground hover:text-destructive"
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {scanLog.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Scanning Activity Log
          </label>
          <div className="bg-background/80 border border-border/60 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[10px] text-muted-foreground space-y-1.5">
            {scanLog.map((log, index) => {
              let color = "text-muted-foreground";
              if (log.includes("❌") || log.includes("status updated to Rejected")) color = "text-rose-500 font-semibold";
              if (log.includes("🎯")) color = "text-primary font-medium";
              if (log.includes("✓")) color = "text-emerald-500";
              if (log.includes("Scan complete")) color = "text-primary font-bold";
              if (log.includes("📈 Status Changes")) color = "text-emerald-500 font-bold border-t border-border/20 pt-1.5";
              if (log.includes("No job application statuses")) color = "text-muted-foreground italic";
              return (
                <div key={index} className={color}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
