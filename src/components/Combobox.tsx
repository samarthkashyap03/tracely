import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ComboboxProps {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Type or select…",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value ?? "");

  React.useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  const filtered = React.useMemo(() => {
    if (!inputValue.trim()) return options;
    return options.filter((o) =>
      o.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              setInputValue(val);
              onChange(val);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className="w-full pr-8"
          />
          <ChevronsUpDown className="absolute right-2.5 top-2.5 size-4 shrink-0 opacity-50 pointer-events-none" />
        </div>
      </PopoverTrigger>
      {filtered.length > 0 && (
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-1 max-h-60 overflow-y-auto bg-card border border-border/60"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-0.5">
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                className="flex items-center justify-between text-left text-sm px-2.5 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition cursor-pointer text-foreground"
                onClick={() => {
                  onChange(opt);
                  setInputValue(opt);
                  setOpen(false);
                }}
              >
                <span>{opt}</span>
                {value === opt && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
