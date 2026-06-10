import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useAddOption, useDeleteOption, useOptions, useUpdateOption } from "@/lib/queries";
import type { OptionCategory, UserOption } from "@/lib/types";
import { toast } from "sonner";

const labels: Record<OptionCategory, string> = {
  status: "Statuses",
  platform: "Platforms",
  role: "Roles",
  work_type: "Work types",
};

export function OptionsManager() {
  const cats: OptionCategory[] = ["status", "platform", "role", "work_type"];
  const [active, setActive] = useState<OptionCategory>("platform");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={
              "rounded-md px-3 py-1.5 text-sm transition " +
              (active === c
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50")
            }
          >
            {labels[c]}
          </button>
        ))}
      </div>
      <OptionList category={active} />
    </div>
  );
}

function OptionList({ category }: { category: OptionCategory }) {
  const { user } = useAuth();
  const { data: all = [] } = useOptions(user?.id);
  const add = useAddOption(user?.id);
  const update = useUpdateOption(user?.id);
  const del = useDeleteOption(user?.id);
  const [newValue, setNewValue] = useState("");
  const items = all.filter((o) => o.category === category);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = newValue.trim();
    if (!v) return;
    try {
      await add.mutateAsync({ category, value: v });
      setNewValue("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Card className="p-4 bg-card/60">
      <form onSubmit={onAdd} className="flex gap-2 mb-4">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`New ${labels[category].toLowerCase().replace(/s$/, "")}…`}
        />
        <Button type="submit" disabled={add.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </form>
      <div className="divide-y divide-border/60">
        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No options yet.</div>
        )}
        {items.map((opt) => (
          <OptionRow
            key={opt.id}
            opt={opt}
            onSave={(v) => update.mutate({ id: opt.id, value: v })}
            onDelete={() => del.mutate(opt.id)}
          />
        ))}
      </div>
    </Card>
  );
}

function OptionRow({
  opt,
  onSave,
  onDelete,
}: {
  opt: UserOption;
  onSave: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(opt.value);
  return (
    <div className="flex items-center justify-between py-2.5">
      {editing ? (
        <Input value={val} onChange={(e) => setVal(e.target.value)} className="max-w-xs" />
      ) : (
        <span className="text-sm">{opt.value}</span>
      )}
      <div className="flex gap-1">
        {editing ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                onSave(val);
                setEditing(false);
              }}
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setVal(opt.value);
                setEditing(false);
              }}
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
