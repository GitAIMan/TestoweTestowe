"use client";

import { Check } from "lucide-react";

export type StepState = "done" | "current" | "future";

export interface Step {
  label: string;
  state: StepState;
}

interface StepProgressBarProps {
  steps: Step[];
}

export function StepProgressBar({ steps }: StepProgressBarProps) {
  return (
    <div className="rounded-lg border bg-card px-4 py-4 shadow-card">
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={idx} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <Circle state={step.state} number={idx + 1} />
                <span
                  className={[
                    "text-[10px] font-semibold uppercase tracking-wider text-center leading-tight",
                    step.state === "current"
                      ? "text-primary"
                      : step.state === "done"
                      ? "text-green-700"
                      : "text-muted-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={[
                    "h-0.5 flex-1 mx-1 mb-5 rounded-full",
                    step.state === "done" ? "bg-green-500" : "bg-border",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Circle({ state, number }: { state: StepState; number: number }) {
  if (state === "done") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }
  if (state === "current") {
    return (
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md ring-2 ring-primary/30">
          <span className="text-sm font-bold">{number}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background text-muted-foreground">
      <span className="text-sm font-semibold">{number}</span>
    </div>
  );
}
