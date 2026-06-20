"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  CalendarDays,
  CalendarCheck2,
  UtensilsCrossed,
  DoorOpen,
  BedDouble,
  Settings,
  BarChart3,
  Bell,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Oferty", href: "/oferty", icon: FileText },
  { name: "Umowy", href: "/umowy", icon: ScrollText },
  { name: "Agendy", href: "/agendy", icon: CalendarDays },
  { name: "Kalendarz", href: "/kalendarz", icon: CalendarCheck2 },
  { name: "Powiadomienia", href: "/powiadomienia", icon: Bell },
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
  const { data: session } = useSession();

  const allNav =
    userRole === "KIEROWNIK"
      ? [...navigation, ...kierownikNav]
      : navigation;

  const userName = session?.user?.name || "U";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navContent = (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Brand area */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/25 flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">H</span>
          </div>
          <span className="text-sm font-bold tracking-tight">Panel Hotelu</span>
        </div>
        {onMobileClose && (
          <Button variant="ghost" size="icon" onClick={onMobileClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {allNav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                isActive
                  ? "bg-accent text-primary font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-accent/80 hover:text-foreground hover:translate-x-0.5"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
              )}
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">
              {userRole === "KIEROWNIK" ? "Kierownik" : "Pracownik"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border bg-sidebar">
        {navContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border z-50 md:hidden flex flex-col">
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
