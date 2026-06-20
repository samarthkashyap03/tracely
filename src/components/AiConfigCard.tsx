import { useState, useEffect } from "react";
import { Info, Eye, EyeOff, Save, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getGroqApiKey,
  setGroqApiKey,
  clearGroqApiKey,
  getGroqModel,
  setGroqModel,
  GROQ_MODELS,
} from "@/lib/groq";
import { toast } from "sonner";

export function AiConfigCard() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    setApiKey(getGroqApiKey());
    setModel(getGroqModel());
  }, []);

  const handleSave = () => {
    setGroqApiKey(apiKey);
    setGroqModel(model);
    toast.success("AI Configuration saved successfully!");
  };

  const handleClear = () => {
    clearGroqApiKey();
    setApiKey("");
    toast.info("Groq API key cleared.");
  };

  return (
    <Card className="p-6 bg-card/60 space-y-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            AI Auto-Fill Settings
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-muted-foreground hover:text-primary transition p-1 rounded-full hover:bg-accent/40"
              title="View Setup Guide"
            >
              <Info className="size-4" />
            </button>
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure Groq AI parameters to extract job application details automatically.
          </p>
        </div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          {showInstructions ? "Hide Guide" : "Show Setup Guide"}
        </button>
      </div>

      {showInstructions && (
        <Alert className="bg-primary/5 border-primary/20 text-foreground animate-in fade-in slide-in-from-top-1 duration-200">
          <Info className="size-4 text-primary" />
          <AlertTitle className="text-sm font-semibold mb-1">How to setup Groq API Key:</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground space-y-2">
            <ol className="list-decimal pl-4 space-y-1.5 mt-1.5">
              <li>
                Go to the{" "}
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  Groq Console <ExternalLink className="size-3 inline" />
                </a>{" "}
                and sign up/log in (it's completely free).
              </li>
              <li>
                Navigate to the <strong>API Keys</strong> tab in the sidebar menu.
              </li>
              <li>
                Click the <strong>Create API Key</strong> button, give it a name (e.g., "Job
                Tracker"), and copy the generated key.
              </li>
              <li>
                Paste your key in the API Key field below, choose your preferred model, and click{" "}
                <strong>Save Configuration</strong>.
              </li>
            </ol>
            <p className="mt-2 text-[11px] leading-normal italic text-primary/80">
              Note: Your API Key is stored safely on your own browser (localStorage) and only sent
              directly to the Groq API endpoint.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Groq API Key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {apiKey && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleClear}
                className="shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                title="Clear API Key"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI Model Selection
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
          >
            {GROQ_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="bg-card text-foreground">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="size-4" /> Save Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
}
