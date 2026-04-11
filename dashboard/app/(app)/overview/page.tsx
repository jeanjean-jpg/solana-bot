import { BotStatusCard } from "@/components/overview/bot-status-card";
import { PnlSummary } from "@/components/overview/pnl-summary";
import { PositionFeed } from "@/components/overview/position-feed";

export default function OverviewPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm">Your bot at a glance</p>
      </div>
      <BotStatusCard />
      <PnlSummary />
      <PositionFeed />
    </div>
  );
}
