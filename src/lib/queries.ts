import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { JobApplication, OptionCategory, UserOption, Resume } from "./types";

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

// ---------- Resumes ----------
export function useResumes(userId: string | undefined) {
  return useQuery({
    queryKey: ["resumes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Resume[];
    },
  });
}

export function useUploadResume(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          name: file.name,
          file_path: fileName,
          size: file.size,
        })
        .select()
        .single();

      if (error) {
        await supabase.storage.from("resumes").remove([fileName]);
        throw error;
      }

      return data as Resume;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes", userId] });
    },
  });
}

export function useDeleteResume(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resume: Resume) => {
      if (!userId) throw new Error("Not authenticated");

      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([resume.file_path]);

      if (storageError && !storageError.message.includes("Object not found")) {
        throw storageError;
      }

      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes", userId] });
      qc.invalidateQueries({ queryKey: ["jobs", userId] });
    },
  });
}
