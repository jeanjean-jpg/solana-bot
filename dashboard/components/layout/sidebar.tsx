"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  Settings2,
  Wallet,
} from "lucide-react";

const nav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/spot", label: "Spot Trading", icon: TrendingUp },
  { href: "/perps", label: "Perps", icon: BarChart2 },
  { href: "/strategies", label: "Strategies", icon: Settings2 },
  { href: "/wallets", label: "Wallets", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col py-6 px-3 gap-1">
      <div className="px-3 mb-6">
        <span className="text-lg font-bold tracking-tight text-green-400">⚡ SolBot</span>
      </div>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === href
              ? "bg-green-500/10 text-green-400"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </aside>
  );
}
