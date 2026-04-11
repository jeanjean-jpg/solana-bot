import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpotPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Spot Trading</h1>
        <p className="text-muted-foreground text-sm">Jupiter swaps + DCA Accumulator</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">DCA Accumulator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Configure DCA strategy in the Strategies page. Active positions appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
