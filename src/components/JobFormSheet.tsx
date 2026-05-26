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

  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : { ...empty });
  }, [open, editing]);

  const set = <K extends keyof JobApplication>(k: K, v: JobApplication[K] | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const byCat = (c: OptionCategory) => options.filter((o) => o.category === c).map((o) => o.value);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name?.trim()) return toast.error("Company name required");
    try {
      // Save custom typed options to database in background
      const categories: { key: "role" | "status" | "work_type" | "platform"; cat: OptionCategory }[] = [
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
            (o) => o.category === cat && o.value.toLowerCase() === trimmed.toLowerCase()
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
              <option value="" className="bg-card text-foreground">No Resume Linked</option>
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
            />
          </Field>

          <SheetFooter className="px-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Save changes" : "Add application"}
            </Button>
          </SheetFooter>
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
