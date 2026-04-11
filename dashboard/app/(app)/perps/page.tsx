import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PerpsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Perps Trading</h1>
        <p className="text-muted-foreground text-sm">Drift Protocol — Longs & Shorts</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Perp positions opened by the bot appear here in real time.</p>
        </CardContent>
      </Card>
    </div>
  );
}
