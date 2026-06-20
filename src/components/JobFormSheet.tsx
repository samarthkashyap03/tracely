import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "./Combobox";
import { useAddOption, useCreateJob, useOptions, useUpdateJob, useResumes } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { JobApplication, OptionCategory } from "@/lib/types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, Info, Eye, EyeOff, ExternalLink } from "lucide-react";
import { getGroqApiKey, setGroqApiKey, getGroqModel, parseJobDescription } from "@/lib/groq";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: JobApplication | null;
}

const empty: Partial<JobApplication> = {
  company_name: "",
  role: "",
  status: "Applied",
  platform: "",
  work_type: "",
  location: "",
  salary: "",
  url: "",
  notes: "",
  resume_id: null,
};

export function JobFormSheet({ open, onOpenChange, editing }: Props) {
  const { user } = useAuth();
  const { data: options = [] } = useOptions(user?.id);
  const { data: resumes = [] } = useResumes(user?.id);
  const create = useCreateJob(user?.id);
  const update = useUpdateJob(user?.id);
  const addOption = useAddOption(user?.id);

  const [form, setForm] = useState<Partial<JobApplication>>(empty);
  const [activeTab, setActiveTab] = useState("manual");
  const [jdText, setJdText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutofilled, setIsAutofilled] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [showTempKey, setShowTempKey] = useState(false);
  const [showInlineGuide, setShowInlineGuide] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : { ...empty });
      setActiveTab("manual");
      setJdText("");
      setIsAnalyzing(false);
      setIsAutofilled(false);
      setHasApiKey(!!getGroqApiKey());
      setTempApiKey("");
    }
  }, [open, editing]);

  const set = <K extends keyof JobApplication>(k: K, v: JobApplication[K] | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const byCat = (c: OptionCategory) => options.filter((o) => o.category === c).map((o) => o.value);

  const handleSaveInlineKey = () => {
    if (!tempApiKey.trim()) return toast.error("Please enter a valid API key");
    setGroqApiKey(tempApiKey);
    setHasApiKey(true);
    toast.success("Groq API Key saved successfully!");
  };

  const handleAnalyze = async () => {
    if (!jdText.trim()) return toast.error("Please paste the job details first");
    setIsAnalyzing(true);
    try {
      const parsed = await parseJobDescription(jdText);
      setForm((f) => ({
        ...f,
        company_name: parsed.company_name || f.company_name || "",
        role: parsed.role || f.role || "",
        work_type: parsed.work_type || f.work_type || "",
        location: parsed.location || f.location || "",
        salary: parsed.salary || f.salary || "",
        platform: parsed.platform || f.platform || "",
        url: parsed.url || f.url || "",
        notes: parsed.notes || f.notes || "",
      }));
      setIsAutofilled(true);
      setActiveTab("manual");
      toast.success("Job description parsed and autofilled!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse job description");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderFields = () => (
    <div className="space-y-4 pt-2">
      <Field label="Company">
        <Input
          required
          value={form.company_name ?? ""}
          onChange={(e) => set("company_name", e.target.value)}
          placeholder="Acme Inc."
        />
      </Field>

      <Field label="Role">
        <Combobox
          value={form.role}
          onChange={(v) => set("role", v)}
          options={byCat("role")}
          placeholder="e.g. Gen AI Engineer"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Combobox
            value={form.status}
            onChange={(v) => set("status", v)}
            options={byCat("status")}
          />
        </Field>
        <Field label="Work type">
          <Combobox
            value={form.work_type}
            onChange={(v) => set("work_type", v)}
            options={byCat("work_type")}
            placeholder="Remote / Hybrid"
          />
        </Field>
      </div>

      <Field label="Platform">
        <Combobox
          value={form.platform}
          onChange={(v) => set("platform", v)}
          options={byCat("platform")}
          placeholder="LinkedIn, Stepstone…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Location">
          <Input
            value={form.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Berlin"
          />
        </Field>
        <Field label="Salary">
          <Input
            value={form.salary ?? ""}
            onChange={(e) => set("salary", e.target.value)}
            placeholder="€80k"
          />
        </Field>
      </div>

      <Field label="Job URL">
        <Input
          type="url"
          value={form.url ?? ""}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field label="Resume used">
        <select
          value={form.resume_id ?? ""}
          onChange={(e) => set("resume_id", e.target.value || null)}
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
        >
          <option value="" className="bg-card text-foreground">
            No Resume Linked
          </option>
          {resumes.map((r) => (
            <option key={r.id} value={r.id} className="bg-card text-foreground">
              {r.name}
            </option>
          ))}
        </select>
      </Field>

      {editing && (
        <Field label="Applied at">
          <Input
            type="datetime-local"
            value={form.applied_at ? toLocalInput(form.applied_at) : ""}
            onChange={(e) => set("applied_at", new Date(e.target.value).toISOString())}
          />
        </Field>
      )}

      <Field label="Notes">
        <Textarea
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Key job details, requirements..."
        />
      </Field>
    </div>
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name?.trim()) return toast.error("Company name required");
    try {
      // Save custom typed options to database in background
      const categories: {
        key: "role" | "status" | "work_type" | "platform";
        cat: OptionCategory;
      }[] = [
        { key: "role", cat: "role" },
        { key: "status", cat: "status" },
        { key: "work_type", cat: "work_type" },
        { key: "platform", cat: "platform" },
      ];

      for (const { key, cat } of categories) {
        const val = form[key];
        if (typeof val === "string" && val.trim()) {
          const trimmed = val.trim();
          const exists = options.some(
            (o) => o.category === cat && o.value.toLowerCase() === trimmed.toLowerCase(),
          );
          if (!exists) {
            addOption.mutate({ category: cat, value: trimmed });
          }
        }
      }

      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form });
        toast.success("Updated");
      } else {
        await create.mutateAsync({
          ...form,
          applied_at: form.applied_at || new Date().toISOString(),
        });
        toast.success("Added");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit application" : "New application"}</SheetTitle>
          <SheetDescription>
            {editing ? "Update details below." : "Date and time are captured automatically."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-4 pb-6">
          {editing ? (
            renderFields()
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="ai">Autofill with AI</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 pt-4">
                {isAutofilled && (
                  <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-xs text-foreground flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary animate-pulse" />
                      <span>AI populated fields. Review, edit, or add missing info below.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(empty);
                        setIsAutofilled(false);
                        toast.info("Form reset to original state.");
                      }}
                      className="text-[10px] uppercase font-semibold text-primary hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                )}
                {renderFields()}
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 pt-4">
                {!hasApiKey ? (
                  <div className="space-y-4 p-4 border border-border/60 bg-card/40 rounded-lg animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Groq API Key Required
                        <button
                          type="button"
                          onClick={() => setShowInlineGuide(!showInlineGuide)}
                          className="text-muted-foreground hover:text-primary transition p-0.5 rounded-full hover:bg-accent/40"
                          title="View Setup Guide"
                        >
                          <Info className="size-3.5" />
                        </button>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowInlineGuide(!showInlineGuide)}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                      >
                        {showInlineGuide ? "Hide Guide" : "Show Setup Guide"}
                      </button>
                    </div>

                    {showInlineGuide && (
                      <Alert className="bg-primary/5 border-primary/20 text-foreground animate-in fade-in slide-in-from-top-1 duration-200">
                        <Info className="size-4 text-primary" />
                        <AlertTitle className="text-sm font-semibold mb-1">
                          Setup Instructions:
                        </AlertTitle>
                        <AlertDescription className="text-xs text-muted-foreground space-y-1.5">
                          <ol className="list-decimal pl-4 space-y-1.5 mt-1">
                            <li>
                              Go to{" "}
                              <a
                                href="https://console.groq.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                              >
                                Groq Console <ExternalLink className="size-3 inline" />
                              </a>{" "}
                              (Free signup).
                            </li>
                            <li>Navigate to **API Keys** and create one.</li>
                            <li>Paste the key below and click save.</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        API Key
                      </Label>
                      <div className="relative">
                        <Input
                          type={showTempKey ? "text" : "password"}
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTempKey(!showTempKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showTempKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveInlineKey}
                      className="w-full text-xs font-semibold h-9"
                    >
                      Save Key & Continue
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Job Posting / Description text
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          Model: {getGroqModel()}
                        </span>
                      </div>
                      <Textarea
                        rows={10}
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        placeholder="Paste the job description (JD), company name, role details, salary, location, or everything from the job page here..."
                        className="resize-none font-sans text-sm focus:border-primary min-h-[220px]"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !jdText.trim()}
                      className="w-full flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="size-4 animate-spin text-primary-foreground" />
                          Analyzing job details...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4 text-primary-foreground" />
                          Analyze & Autofill
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {(editing || activeTab === "manual") && (
            <SheetFooter className="px-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editing ? "Save changes" : "Add application"}
              </Button>
            </SheetFooter>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}
