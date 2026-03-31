"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HintProps {
  children: React.ReactNode;
  label: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function Hint({ children, label, side = "bottom" }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[220px] text-center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
