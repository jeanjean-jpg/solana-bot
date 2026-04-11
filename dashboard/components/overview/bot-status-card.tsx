"use client";

import { useBotState } from "@/hooks/use-bot-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BotStatusCard() {
  const { botState, toggleBot } = useBotState();
  const isRunning = botState?.is_running ?? false;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Bot Status</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className={cn("text-2xl font-bold", isRunning ? "text-green-400" : "text-red-400")}>
            {isRunning ? "RUNNING" : "STOPPED"}
          </p>
          {botState?.last_heartbeat && (
            <p className="text-xs text-muted-foreground mt-1">
              Last heartbeat: {new Date(botState.last_heartbeat).toLocaleTimeString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Active strategies: {botState?.active_strategy_count ?? 0}
          </p>
        </div>
        <Button
          size="lg"
          onClick={toggleBot}
          className={cn(
            "font-bold text-base px-8",
            isRunning
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-black"
          )}
        >
          {isRunning ? "STOP" : "START"}
        </Button>
      </CardContent>
    </Card>
  );
}
