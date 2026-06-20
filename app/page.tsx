import { Check, Clock, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { GradientText } from "@/components/ui/gradient-text";
import { ScanLine } from "@/components/ui/scan-line";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center gap-8 overflow-hidden p-6 py-16">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 bg-[image:var(--gradient-primary)]"
      />

      <GlassPanel className="relative z-10 flex w-full max-w-md items-center justify-between gap-4 overflow-hidden px-6 py-4">
        <ScanLine />
        <span className="font-mono text-xs uppercase tracking-widest text-foreground">
          Scanning pass…
        </span>
        <span className="font-mono text-xs text-muted-foreground">Gate 2</span>
      </GlassPanel>

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl bg-card ring-1 ring-border shadow-lg">
        <div className="h-1.5 w-full bg-[image:var(--gradient-primary)]" />
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-1 flex-col gap-6 p-8">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                You&apos;re <GradientText>checked in</GradientText>
              </h1>
              <p className="font-sans text-base leading-relaxed text-muted-foreground">
                Your spot for the 2:30 PM consultation is confirmed. Keep this
                pass handy — the front desk will scan it when you arrive.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>Add to calendar</Button>
              <Button disabled>
                <Check />
                Checked in
              </Button>
            </div>
          </div>
          <div className="relative flex flex-col items-center justify-center gap-1 border-t border-dashed border-border p-8 sm:w-56 sm:border-t-0 sm:border-l">
            <span className="absolute left-1/2 top-0 hidden size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background sm:block" />
            <span className="absolute bottom-0 left-1/2 hidden size-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-background sm:block" />
            <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Check-in time
            </span>
            <span className="font-mono text-3xl font-medium text-foreground">
              14:30
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Jun 19, 2026
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-wrap items-center justify-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
        <Badge variant="success">
          <Check />
          Confirmed
        </Badge>
        <Badge variant="warning">
          <Clock />
          Pending
        </Badge>
        <Badge variant="danger">
          <X />
          Cancelled
        </Badge>
      </div>
    </main>
  );
}
