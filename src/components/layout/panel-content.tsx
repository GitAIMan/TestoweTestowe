"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface PanelContentProps {
  userRole: string;
  children: React.ReactNode;
}

export function PanelContent({ userRole, children }: PanelContentProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar
        userRole={userRole}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="md:pl-64">
        <Topbar onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
