"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

function NumberInputBlocker() {
  useEffect(() => {
    // Blokuj scroll na polach numerycznych
    function handleWheel(e: WheelEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "number") {
        e.preventDefault();
        (target as HTMLInputElement).blur();
      }
    }

    // Blokuj strzałki góra/dół na polach numerycznych
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" &&
        (target as HTMLInputElement).type === "number" &&
        (e.key === "ArrowUp" || e.key === "ArrowDown")
      ) {
        e.preventDefault();
      }
    }

    document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("wheel", handleWheel, { capture: true });
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <ConfirmProvider>
          <NumberInputBlocker />
          {children}
          <Toaster position="top-right" richColors />
        </ConfirmProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
