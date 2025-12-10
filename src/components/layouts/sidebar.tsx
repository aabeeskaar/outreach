"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  FileText,
  Users,
  PenSquare,
  History,
  Settings,
  Mail,
  LogOut,
  Crown,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Recipients", href: "/recipients", icon: Users },
  { name: "Compose", href: "/compose", icon: PenSquare },
  { name: "History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Upgrade", href: "/pricing", icon: Crown, highlight: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Mail className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-lg">OutreachAI</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const isHighlight = 'highlight' in item && item.highlight;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isHighlight
                  ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-yellow-600 dark:text-yellow-400 hover:from-yellow-500/20 hover:to-orange-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isHighlight && "text-yellow-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t">
        <Separator className="mb-4" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
