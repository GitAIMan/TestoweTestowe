"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  CalendarDays,
  UtensilsCrossed,
  DoorOpen,
  BedDouble,
  Settings,
  BarChart3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Oferty", href: "/oferty", icon: FileText },
  { name: "Umowy", href: "/umowy", icon: ScrollText },
  { name: "Agendy", href: "/agendy", icon: CalendarDays },
  { name: "Menu", href: "/menu", icon: UtensilsCrossed },
  { name: "Sale", href: "/sale", icon: DoorOpen },
  { name: "Pokoje", href: "/pokoje", icon: BedDouble },
];

const kierownikNav = [
  { name: "Podsumowania", href: "/podsumowania", icon: BarChart3 },
  { name: "Ustawienia", href: "/ustawienia", icon: Settings },
];

interface SidebarProps {
  userRole: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ userRole, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const allNav =
    userRole === "KIEROWNIK"
      ? [...navigation, ...kierownikNav]
      : navigation;

  const navContent = (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between h-16 px-6 border-b">
        <h1 className="text-lg font-semibold">Panel Hotelu</h1>
        {onMobileClose && (
          <Button variant="ghost" size="icon" onClick={onMobileClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {allNav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
        {navContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r z-50 md:hidden flex flex-col">
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
