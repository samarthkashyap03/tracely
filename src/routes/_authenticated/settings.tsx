import { createFileRoute } from "@tanstack/react-router";
import { OptionsManager } from "@/components/OptionsManager";
import { AiConfigCard } from "@/components/AiConfigCard";
import { GmailAgentCard } from "@/components/GmailAgentCard";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize your dropdown options and AI configuration.
        </p>
      </div>
      <AiConfigCard />
      <GmailAgentCard />
      <OptionsManager />
    </main>
  );
}
