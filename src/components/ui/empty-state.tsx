import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  emphasized?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  emphasized,
}: EmptyStateProps) {
  const btn = actionLabel ? (
    <Button size="lg" onClick={actionOnClick} className={emphasized ? "animate-pulse shadow-[0_0_0_3px_rgba(209,100,112,0.25)]" : ""}>
      {actionLabel}
    </Button>
  ) : null;
  return (
    <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 px-8 py-16 flex flex-col items-center text-center">
      <div className="rounded-xl bg-primary/10 p-3 mb-4">
        <Icon className="h-6 w-6 text-primary/60" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {btn && (
        <div className="mt-4">
          {actionOnClick ? btn : actionHref ? <Link href={actionHref}>{btn}</Link> : btn}
        </div>
      )}
    </div>
  );
}
