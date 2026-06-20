import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, CheckCircle2, Circle, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import type { UserNote } from "@/lib/types";

export function QuickNotes({ isEmbed = false }: { isEmbed?: boolean }) {
  const { user } = useAuth();
  const [inputText, setInputText] = React.useState("");
  const [localFallback, setLocalFallback] = React.useState(false);
  const [localNotes, setLocalNotes] = React.useState<UserNote[]>([]);

  // Supabase hooks
  const { data: dbNotes = [], isLoading, error: dbError } = useNotes(user?.id);
  const createNote = useCreateNote(user?.id);
  const updateNote = useUpdateNote(user?.id);
  const deleteNote = useDeleteNote(user?.id);

  // Load local notes from localStorage if fallback mode or dbError is active
  React.useEffect(() => {
    if (dbError) {
      setLocalFallback(true);
    }
  }, [dbError]);

  React.useEffect(() => {
    if (localFallback || dbError) {
      const saved = localStorage.getItem(`tracely_notes_${user?.id || "anon"}`);
      if (saved) {
        try {
          setLocalNotes(JSON.parse(saved));
        } catch {
          setLocalNotes([]);
        }
      }
    }
  }, [localFallback, dbError, user?.id]);

  const saveLocalNotes = (notes: UserNote[]) => {
    setLocalNotes(notes);
    localStorage.setItem(`tracely_notes_${user?.id || "anon"}`, JSON.stringify(notes));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (localFallback) {
      const newNote: UserNote = {
        id: Math.random().toString(36).substring(2, 9),
        user_id: user?.id || "anon",
        content: inputText.trim(),
        completed: false,
        created_at: new Date().toISOString(),
      };
      saveLocalNotes([newNote, ...localNotes]);
      setInputText("");
      toast.success("Note added (saved locally)");
    } else {
      try {
        await createNote.mutateAsync(inputText.trim());
        setInputText("");
      } catch (err: any) {
        if (
          err.message?.includes("relation") ||
          err.message?.includes("does not exist") ||
          err.message?.includes("404")
        ) {
          setLocalFallback(true);
          const newNote: UserNote = {
            id: Math.random().toString(36).substring(2, 9),
            user_id: user?.id || "anon",
            content: inputText.trim(),
            completed: false,
            created_at: new Date().toISOString(),
          };
          saveLocalNotes([newNote, ...localNotes]);
          setInputText("");
          toast.info("Notes saved locally. Run the SQL schema to enable database cloud sync!");
        } else {
          toast.error(err.message || "Failed to add note");
        }
      }
    }
  };

  const handleToggle = async (note: UserNote) => {
    if (localFallback) {
      const updated = localNotes.map((n) =>
        n.id === note.id ? { ...n, completed: !n.completed } : n,
      );
      saveLocalNotes(updated);
    } else {
      try {
        await updateNote.mutateAsync({ id: note.id, completed: !note.completed });
      } catch (err) {
        toast.error("Failed to update note");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (localFallback) {
      const updated = localNotes.filter((n) => n.id !== id);
      saveLocalNotes(updated);
      toast.success("Note deleted");
    } else {
      try {
        await deleteNote.mutateAsync(id);
      } catch (err) {
        toast.error("Failed to delete note");
      }
    }
  };

  const notesList = localFallback ? localNotes : dbNotes;

  const innerContent = (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      <form onSubmit={handleAdd} className="flex gap-2 shrink-0">
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. Apply to X on Monday"
          className="text-xs bg-background/50 h-8"
        />
        <Button type="submit" size="icon" className="size-8 shrink-0">
          <Plus className="size-4" />
        </Button>
      </form>

      {localFallback && (
        <div className="text-[10px] text-amber-500/90 bg-amber-500/5 border border-amber-500/10 rounded p-2 shrink-0 leading-normal">
          ⚠️ Saving locally. Create the <code className="font-mono text-amber-400">user_notes</code>{" "}
          table in your Supabase SQL editor to sync across devices.
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
        {isLoading && !localFallback ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-1.5">
            <Loader2 className="size-3.5 animate-spin" /> Loading notes…
          </div>
        ) : notesList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/60 text-xs italic">
            No reminders yet. Add one above!
          </div>
        ) : (
          notesList.map((note) => (
            <div
              key={note.id}
              className="flex items-start justify-between gap-2 p-2 rounded-lg bg-accent/20 hover:bg-accent/40 border border-border/20 group transition-all"
            >
              <button
                type="button"
                onClick={() => handleToggle(note)}
                className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0 transition"
              >
                {note.completed ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <Circle className="size-4 opacity-60" />
                )}
              </button>
              <span
                className={`text-xs text-foreground flex-1 break-all leading-relaxed ${
                  note.completed ? "line-through opacity-45" : ""
                }`}
              >
                {note.content}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (isEmbed) {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="size-4 text-primary" /> Quick Notes & Tasks
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Jot down quick reminders or general to-dos.
          </p>
        </div>
        {innerContent}
      </div>
    );
  }

  return (
    <Card className="bg-card/40 border border-border/60 flex flex-col h-full min-h-[350px] lg:max-h-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <StickyNote className="size-4 text-primary" /> Quick Notes & Tasks
        </CardTitle>
        <CardDescription className="text-xs">
          Jot down quick reminders or general to-dos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col min-h-0 pb-4">
        {innerContent}
      </CardContent>
    </Card>
  );
}
