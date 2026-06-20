import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useResumes, useUploadResume, useDeleteResume, useJobs } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Eye,
  Briefcase,
  Calendar,
  Loader2,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import type { Resume } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/resumes")({
  component: ResumesPage,
});

function ResumesPage() {
  const { user } = useAuth();
  const { data: resumes = [], isLoading: loadingResumes } = useResumes(user?.id);
  const { data: jobs = [] } = useJobs(user?.id);

  const upload = useUploadResume(user?.id);
  const remove = useDeleteResume(user?.id);

  const [dragActive, setDragActive] = useState(false);
  const [deletingResume, setDeletingResume] = useState<Resume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith(".docx") &&
      !file.name.endsWith(".doc") &&
      !file.name.endsWith(".pdf")
    ) {
      toast.error("Please upload only PDF or Word documents.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    try {
      const toastId = toast.loading(`Uploading "${file.name}"...`);
      await upload.mutateAsync(file);
      toast.dismiss(toastId);
      toast.success("Resume uploaded successfully");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload resume.");
    }
  };

  const downloadFile = async (resume: Resume) => {
    try {
      const toastId = toast.loading(`Downloading "${resume.name}"...`);
      const { data, error } = await supabase.storage.from("resumes").download(resume.file_path);
      toast.dismiss(toastId);

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = resume.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to download file");
    }
  };

  const previewFile = async (resume: Resume) => {
    try {
      const toastId = toast.loading(`Opening preview for "${resume.name}"...`);
      const { data, error } = await supabase.storage.from("resumes").download(resume.file_path);
      toast.dismiss(toastId);

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to preview file");
    }
  };

  const confirmDelete = async () => {
    if (!deletingResume) return;
    try {
      const toastId = toast.loading(`Deleting "${deletingResume.name}"...`);
      await remove.mutateAsync(deletingResume);
      toast.dismiss(toastId);
      toast.success("Resume deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete resume");
    } finally {
      setDeletingResume(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            Manage your resumes and track which ones you used for applications.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/60 hover:border-primary/50 hover:bg-card/20"
        } bg-card/40`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx"
          onChange={handleFileInput}
        />

        <div className="flex flex-col items-center justify-center space-y-3 cursor-pointer">
          <div className="p-3 rounded-full bg-accent text-primary">
            {upload.isPending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <UploadCloud className="size-6" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {upload.isPending ? "Uploading document..." : "Click to upload or drag & drop"}
            </p>
            <p className="text-xs text-muted-foreground">PDF or Word formats only (Max 10MB)</p>
          </div>
        </div>
      </div>

      {/* Resumes List */}
      {loadingResumes ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/10 text-center py-16 text-muted-foreground">
          <FileText className="size-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
          <p className="font-medium text-foreground">No resumes uploaded yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Upload your resume above to start organizing and linking them to your job applications.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => {
            const linkedJobs = jobs.filter((j) => j.resume_id === resume.id);
            const isPdf = resume.name.toLowerCase().endsWith(".pdf");

            return (
              <div
                key={resume.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card/40 hover:bg-card/60 p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${isPdf ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"}`}
                      >
                        <FileIcon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="font-medium text-sm truncate text-foreground"
                          title={resume.name}
                        >
                          {resume.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{formatSize(resume.size)}</span>
                          <span>•</span>
                          <Calendar className="size-3" />
                          <span>
                            {formatDistanceToNow(new Date(resume.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Linked Applications */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      <Briefcase className="size-3" />
                      <span>
                        Used in {linkedJobs.length}{" "}
                        {linkedJobs.length === 1 ? "application" : "applications"}
                      </span>
                    </div>
                    {linkedJobs.length > 0 ? (
                      <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                        {linkedJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between text-xs py-1 px-2 bg-accent/40 rounded border border-border/20"
                          >
                            <span className="font-medium truncate text-foreground max-w-[120px]">
                              {job.company_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                              {job.role || "Role"}
                            </span>
                            <StatusBadge
                              status={job.status}
                              className="scale-90 origin-right py-0 px-1.5 h-4"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        Not used in any applications yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => previewFile(resume)}
                      title="Preview Resume"
                      className="h-8 px-2 hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadFile(resume)}
                      title="Download Resume"
                      className="h-8 px-2 hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingResume(resume)}
                    title="Delete Resume"
                    className="h-8 px-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingResume} onOpenChange={(o) => !o && setDeletingResume(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resume?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingResume?.name}"? This will remove the file
              from storage and unlink it from any job applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
