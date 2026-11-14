"use client";

import { Button } from "./ui";
import { Wordmark } from "./wordmark";

export interface LoadStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "done" | "skipped" | "error";
  progress?: number | null; // 0..1 when known
}

export function LoadingView({
  steps,
  showSteps,
  error,
  onRetry,
  onStatic,
}: {
  steps: LoadStep[];
  showSteps: boolean;
  error: string | null;
  onRetry: () => void;
  onStatic: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-5 md:px-8">
        <Wordmark />
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        {error ? (
          <div className="max-w-[520px] rounded-[8px] border border-hairline bg-surface p-6" role="alert">
            <p className="font-display text-[22px] font-semibold">Couldn&apos;t load the terrain file.</p>
            <p className="mt-2 text-[15px] text-muted num break-words">{error}</p>
            <div className="mt-5 flex gap-3">
              <Button variant="primary" onClick={onRetry}>
                Retry
              </Button>
              <Button onClick={onStatic}>View static version</Button>
            </div>
          </div>
        ) : showSteps ? (
          <ol className="w-full max-w-[560px] space-y-4" aria-live="polite">
            {steps.map((s) => (
              <li key={s.id} className="rounded-[8px] border border-hairline bg-surface px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-[16px] ${s.status === "pending" ? "text-muted" : "text-ink"}`}>{s.label}</span>
                  <span className="text-[14px] text-muted">
                    {s.status === "done" ? "done" : s.status === "active" ? "working" : s.status === "skipped" ? "skipped" : s.status === "error" ? "failed" : ""}
                  </span>
                </div>
                <p className="mt-1 text-[14px] text-muted num break-all">{s.detail}</p>
                {s.status === "active" && typeof s.progress === "number" ? (
                  <div className="mt-3 h-[3px] w-full bg-hairline" aria-hidden="true">
                    <div className="h-full bg-copper" style={{ width: `${Math.round(s.progress * 100)}%` }} />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </main>
    </div>
  );
}
