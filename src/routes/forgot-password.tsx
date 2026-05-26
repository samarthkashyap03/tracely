import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent");
  };

  return <AuthShell title="Reset password" subtitle="We'll email you a reset link">
    {sent ? (
      <div className="text-sm text-muted-foreground">
        Check your inbox for a link to reset your password.
      </div>
    ) : (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Sending…" : "Send reset link"}</Button>
      </form>
    )}
    <p className="mt-6 text-center text-sm text-muted-foreground">
      <Link to="/login" className="hover:text-foreground">Back to sign in</Link>
    </p>
  </AuthShell>;
}
