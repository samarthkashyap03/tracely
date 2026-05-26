import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, CheckCircle2, LayoutGrid, Lock, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Tracely — Premium Job Application Tracker" },
      {
        name: "description",
        content:
          "Stop losing track of job applications. Tracely is a calm, premium dashboard for every role you apply to.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-30 bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Briefcase className="size-4" />
            </div>
            Tracely
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[500px] max-w-4xl bg-[radial-gradient(closest-side,var(--primary)_0%,transparent_70%)] opacity-25 blur-3xl" />
          <div className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Built for serious job seekers
            </div>
            <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Every application. <span className="text-primary">One quiet dashboard.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
              Track companies, statuses, platforms, and roles without spreadsheet chaos. Customize
              every field. Own your data.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Start tracking — it's free
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-medium hover:bg-accent"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: LayoutGrid,
                title: "Clean table view",
                body: "Sort, filter, search. No cognitive overload — just the columns that matter.",
              },
              {
                icon: Zap,
                title: "Custom fields",
                body: "Add your own platforms, statuses, work types, and roles. Make it yours.",
              },
              {
                icon: Lock,
                title: "Your data, secured",
                body: "Row-level security on Supabase. Only you can see your applications.",
              },
              {
                icon: CheckCircle2,
                title: "Auto timestamps",
                body: "Applied date is captured the moment you add an entry.",
              },
              {
                icon: Briefcase,
                title: "Every detail",
                body: "Company, role, salary, link, notes, location — keep it all in one row.",
              },
              {
                icon: Sparkles,
                title: "Premium feel",
                body: "Dark by default. Designed to feel calm even when your inbox isn't.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/70 bg-card/40 p-6 hover:bg-card transition"
              >
                <div className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
                  <f.icon className="size-4" />
                </div>
                <h3 className="mt-4 font-medium">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} Tracely</span>
          <span>Built with React, Supabase & Tailwind</span>
        </div>
      </footer>
    </div>
  );
}
