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
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { analyzeEmailsBatch } from "@/lib/groq";
import { useJobs, useUpdateJob } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { JobApplication } from "@/lib/types";

const REJECTION_KEYWORDS = [
  "unfortunately",
  "regret to inform",
  "regretfully",
  "not moving forward",
  "move forward with other candidates",
  "proceed with other candidates",
  "selected another candidate",
  "chosen another candidate",
  "other candidates",
  "position has been filled",
  "role has been filled",
  "vacancy has been filled",
  "opening has been filled",
  "not selected",
  "were not selected",
  "not successful",
  "application unsuccessful",
  "unsuccessful application",
  "unable to offer",
  "unable to proceed",
  "unable to move forward",
  "thank you for your interest",
  "thank you for applying",
  "careful consideration",
  "after careful review",
  "after careful consideration",
  "after reviewing your application",
  "after reviewing your qualifications",
  "decided not to proceed",
  "decided not to move forward",
  "not to move forward",
  "not a fit for the role",
  "not the right fit",
  "not the best fit",
  "won't be progressing",
  "will not be progressing",
  "not progressing your application",
  "unable",
  "leider",
  "absage",
  "bewerbungsabsage",
  "wir müssen ihnen leider mitteilen",
  "nicht berücksichtigen",
  "nicht weiter berücksichtigen",
  "konnten sie nicht berücksichtigen",
  "haben uns für andere kandidaten entschieden",
  "für andere kandidaten entschieden",
  "andere kandidaten",
  "anderen bewerber",
  "anderen bewerbern",
  "nicht in die engere auswahl",
  "nicht in die nähere auswahl",
  "auswahlverfahren",
  "nicht erfolgreich",
  "bewerbung leider",
  "abschlägige entscheidung",
  "keine weitere berücksichtigung",
  "nicht weiterverfolgen",
  "nicht fortsetzen",
  "stellenbesetzung",
  "stelle bereits besetzt",
  "position bereits besetzt",
  "die stelle nicht",
  "stelle nicht anbieten können",
  "die stelle nicht anbieten können",
  "wir haben auf die ausschreibung eine vielzahl"
];

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

      const candidateEmails = emails.filter((email) => {
        const cleanBody = (email.body || "").toLowerCase().replace(/\s+/g, " ");
        return REJECTION_KEYWORDS.some((kw) => {
          const cleanKw = kw.toLowerCase().replace(/\s+/g, " ");
          return cleanBody.includes(cleanKw);
        });
      });

      setScanLog((prev) => [
        ...prev,
        `Identified ${candidateEmails.length} potential job-related emails to analyze out of ${emails.length}.`,
      ]);

      const updatedJobsList: JobApplication[] = [];

      if (candidateEmails.length > 0) {
        const queuedEmails = candidateEmails.map((email, idx) => ({
          id: `Mail ${idx + 1}`,
          subject: email.subject,
          from: email.from,
          body: email.body,
        }));

        setScanLog((prev) => [
          ...prev,
          "Sending all candidate emails to LLM in a single batch call...",
        ]);

        try {
          const results = await analyzeEmailsBatch(queuedEmails, companyNames);

          for (const result of results) {
            const queued = queuedEmails.find((q) => q.id === result.id);
            const emailSubject = queued ? queued.subject : "Unknown Subject";

            setScanLog((prev) => [
              ...prev,
              `Processing result for ${result.id} ("${emailSubject}")...`,
              `↳ Classification: Relevant: ${result.is_relevant}, Rejection: ${result.is_rejection}, Company: ${result.company_name || 'None'}`,
            ]);

            if (!result.is_relevant) {
              setScanLog((prev) => [...prev, `✓ ${result.id} Skipped: Unrelated to job applications.`]);
              continue;
            }

            if (result.is_rejection && result.company_name) {
              const matchedJob = findMatchingJob(result.company_name);

              if (matchedJob) {
                const currentStatus = matchedJob.status.toLowerCase();

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
              setScanLog((prev) => [...prev, `✓ ${result.id} parsed: Not a rejection (relevant update/interview/receipt).`]);
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setScanLog((prev) => [
            ...prev,
            `❌ Batch analysis failed: ${msg}. Data untouched.`,
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
                <option value={2}>Yesterday & Today</option>
                <option value={3}>Past 3 Days</option>
                <option value={5}>Past 5 Days</option>
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

      {scanLog.length > 0 && (() => {
        const statusLog = scanLog.filter((log) => {
          return (
            log.includes("❌") ||
            log.includes("⚠️") ||
            log.includes("➔") ||
            log.includes("📈") ||
            log.includes("Scan complete") ||
            log.includes("status updated to Rejected") ||
            log.includes("Successfully updated")
          );
        });

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agent Status Updates Log
              </label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-xs text-primary hover:text-primary/80">
                    View Detailed Log
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto bg-card border border-border">
                  <DialogHeader>
                    <DialogTitle>Detailed Scanning Activity Log</DialogTitle>
                  </DialogHeader>
                  <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs text-muted-foreground space-y-1.5 overflow-y-auto max-h-[60vh] mt-4">
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
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-background/80 border border-border/60 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[10px] text-muted-foreground space-y-1.5">
              {statusLog.length > 0 ? (
                statusLog.map((log, index) => {
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
                })
              ) : (
                <div className="text-muted-foreground italic text-center py-2">
                  {scanning ? "Scanning emails in progress..." : "No status changes to report."}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </Card>
  );
}
