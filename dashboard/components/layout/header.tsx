"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isRunning?: boolean;
  lastHeartbeat?: string | null;
}

export function Header({ isRunning = false, lastHeartbeat }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur">
      <div />
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            isRunning
              ? "border-green-500 text-green-400"
              : "border-muted-foreground text-muted-foreground"
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 inline-block", isRunning ? "bg-green-400 animate-pulse" : "bg-muted-foreground")} />
          {isRunning ? "Bot Running" : "Bot Stopped"}
        </Badge>
      </div>
    </header>
  );
}
