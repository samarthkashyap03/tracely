import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Briefcase, LogOut, Settings, LayoutDashboard, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const navLink = (to: string, label: string, Icon: typeof Settings) => (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition",
        pathname === to
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Briefcase className="size-4" />
            </div>
            Tracely
          </Link>
          <nav className="flex items-center gap-1">
            {navLink("/dashboard", "Dashboard", LayoutDashboard)}
            {navLink("/resumes", "Resumes", FileText)}
            {navLink("/settings", "Settings", Settings)}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs text-muted-foreground max-w-[180px] truncate">
            {user?.email}
          </div>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
