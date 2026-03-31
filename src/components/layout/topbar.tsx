"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Menu } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { data, mutate } = useSWR<{
    notifications: NotificationItem[];
    unreadCount: number;
  }>("/api/notifications", fetcher, { refreshInterval: 30000 });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    mutate();
  }

  const unread = data?.unreadCount || 0;

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border/40 bg-card/85 backdrop-blur-md shadow-[var(--shadow-topbar)] flex items-center justify-between px-6">
      {/* Hamburger — tylko mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {/* Powiadomienia */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-card border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b">
                  <span className="text-sm font-semibold">Powiadomienia</span>
                </div>
                {!data || data.notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Brak powiadomień
                  </div>
                ) : (
                  data.notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) markRead(n.id);
                      }}
                      className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-accent/40 transition-colors ${
                        !n.isRead ? "bg-accent/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {n.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.createdAt).toLocaleDateString("pl-PL", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
