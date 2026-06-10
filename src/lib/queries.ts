import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { JobApplication, OptionCategory, UserOption } from "./types";

// ---------- Jobs ----------
export function useJobs(userId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobApplication[];
    },
  });
}

export function useCreateJob(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<JobApplication>) => {
      if (!userId) throw new Error("Not authenticated");
      const payload = { ...input, user_id: userId };
      const { data, error } = await supabase
        .from("job_applications")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as JobApplication;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", userId] }),
  });
}

export function useUpdateJob(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<JobApplication> & { id: string }) => {
      const { data, error } = await supabase
        .from("job_applications")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as JobApplication;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", userId] }),
  });
}

export function useDeleteJob(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", userId] }),
  });
}

// ---------- Options ----------
export function useOptions(userId: string | undefined) {
  return useQuery({
    queryKey: ["options", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_options")
        .select("*")
        .order("value", { ascending: true });
      if (error) throw error;
      return (data ?? []) as UserOption[];
    },
  });
}

export function useAddOption(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, value }: { category: OptionCategory; value: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const v = value.trim();
      if (!v) throw new Error("Value required");
      const { data, error } = await supabase
        .from("user_options")
        .insert({ user_id: userId, category, value: v })
        .select()
        .single();
      if (error && !String(error.message).includes("duplicate")) throw error;
      return data as UserOption;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["options", userId] }),
  });
}

export function useUpdateOption(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase
        .from("user_options")
        .update({ value: value.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["options", userId] }),
  });
}

export function useDeleteOption(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["options", userId] }),
  });
}
