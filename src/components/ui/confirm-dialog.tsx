"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  function handleClose(result: boolean) {
    if (state) {
      state.resolve(result);
      setState(null);
    }
  }

  const variant = state?.variant ?? "destructive";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!state} onOpenChange={(open) => { if (!open) handleClose(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                  variant === "destructive"
                    ? "bg-red-100 text-red-600"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <DialogTitle className="text-left text-lg">
                  {state?.title}
                </DialogTitle>
                <DialogDescription className="text-left mt-2 leading-relaxed">
                  {state?.description || "Tej operacji nie da się cofnąć."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {state?.cancelLabel || "Anuluj"}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={() => handleClose(true)}
            >
              {state?.confirmLabel || "Tak, usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm musi być używany wewnątrz <ConfirmProvider>");
  }
  return ctx;
}
