"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WalletSelector } from "./wallet-selector";
import type { Strategy, StrategyId, Wallet } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  strategy: Strategy;
  wallets: Wallet[];
  onSaved: (updated: Strategy) => void;
}

function Field({ label, name, value, onChange, type = "text", min, max, step, placeholder }: {
  label: string; name: string; value: string | number; onChange: (v: string) => void;
  type?: string; min?: number; max?: number; step?: number; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Input
        id={name} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        min={min} max={max} step={step} placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

function DcaFields({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Token Mint" name="token_mint" value={cfg.token_mint as string ?? ""} onChange={v => set("token_mint", v)} placeholder="So111..." />
      <Field label="Token Symbol" name="token_symbol" value={cfg.token_symbol as string ?? ""} onChange={v => set("token_symbol", v)} placeholder="SOL" />
      <Field label="Entry Size (USD)" name="entry_size_usd" value={cfg.entry_size_usd as number ?? 50} type="number" min={1} step={1} onChange={v => set("entry_size_usd", Number(v))} />
      <Field label="DCA Rebuy Size (USD)" name="dca_size_usd" value={cfg.dca_size_usd as number ?? 25} type="number" min={1} step={1} onChange={v => set("dca_size_usd", Number(v))} />
      <Field label="Dip Trigger (%)" name="dip_trigger_pct" value={cfg.dip_trigger_pct as number ?? 5} type="number" min={1} max={50} step={0.5} onChange={v => set("dip_trigger_pct", Number(v))} />
      <Field label="Take Profit (%)" name="take_profit_pct" value={cfg.take_profit_pct as number ?? 15} type="number" min={1} max={200} step={0.5} onChange={v => set("take_profit_pct", Number(v))} />
      <Field label="Max Buys" name="max_buys" value={cfg.max_buys as number ?? 5} type="number" min={1} max={20} onChange={v => set("max_buys", Number(v))} />
    </>
  );
}

function SwingFields({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Token Mint" name="token_mint" value={cfg.token_mint as string ?? ""} onChange={v => set("token_mint", v)} />
      <Field label="Token Symbol" name="token_symbol" value={cfg.token_symbol as string ?? ""} onChange={v => set("token_symbol", v)} placeholder="SOL" />
      <Field label="Fast EMA Period" name="fast_ema" value={cfg.fast_ema as number ?? 9} type="number" min={2} max={50} onChange={v => set("fast_ema", Number(v))} />
      <Field label="Slow EMA Period" name="slow_ema" value={cfg.slow_ema as number ?? 21} type="number" min={5} max={200} onChange={v => set("slow_ema", Number(v))} />
      <Field label="RSI Period" name="rsi_period" value={cfg.rsi_period as number ?? 14} type="number" min={5} max={30} onChange={v => set("rsi_period", Number(v))} />
      <Field label="RSI Oversold" name="rsi_oversold" value={cfg.rsi_oversold as number ?? 30} type="number" min={10} max={45} onChange={v => set("rsi_oversold", Number(v))} />
      <Field label="RSI Overbought" name="rsi_overbought" value={cfg.rsi_overbought as number ?? 70} type="number" min={55} max={90} onChange={v => set("rsi_overbought", Number(v))} />
      <Field label="Position Size (USD)" name="position_size_usd" value={cfg.position_size_usd as number ?? 100} type="number" min={1} onChange={v => set("position_size_usd", Number(v))} />
      <Field label="Stop Loss (%)" name="stop_loss_pct" value={cfg.stop_loss_pct as number ?? 5} type="number" min={0.5} max={50} step={0.5} onChange={v => set("stop_loss_pct", Number(v))} />
      <Field label="Take Profit (%)" name="take_profit_pct" value={cfg.take_profit_pct as number ?? 10} type="number" min={0.5} max={200} step={0.5} onChange={v => set("take_profit_pct", Number(v))} />
    </>
  );
}

function ScalpingFields({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Token Mint" name="token_mint" value={cfg.token_mint as string ?? ""} onChange={v => set("token_mint", v)} />
      <Field label="Token Symbol" name="token_symbol" value={cfg.token_symbol as string ?? ""} onChange={v => set("token_symbol", v)} />
      <Field label="Position Size (USD)" name="position_size_usd" value={cfg.position_size_usd as number ?? 50} type="number" min={1} onChange={v => set("position_size_usd", Number(v))} />
      <Field label="Volume Spike Multiplier" name="volume_multiplier" value={cfg.volume_multiplier as number ?? 3} type="number" min={1.5} max={10} step={0.5} onChange={v => set("volume_multiplier", Number(v))} />
      <Field label="Profit Target (%)" name="profit_target_pct" value={cfg.profit_target_pct as number ?? 2} type="number" min={0.1} max={20} step={0.1} onChange={v => set("profit_target_pct", Number(v))} />
      <Field label="Stop Loss (%)" name="stop_loss_pct" value={cfg.stop_loss_pct as number ?? 1} type="number" min={0.1} max={10} step={0.1} onChange={v => set("stop_loss_pct", Number(v))} />
      <Field label="Max Hold (seconds)" name="max_hold_seconds" value={cfg.max_hold_seconds as number ?? 300} type="number" min={30} max={3600} step={30} onChange={v => set("max_hold_seconds", Number(v))} />
    </>
  );
}

function SniperFields({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Max Buy (USD)" name="max_buy_usd" value={cfg.max_buy_usd as number ?? 50} type="number" min={1} onChange={v => set("max_buy_usd", Number(v))} />
      <Field label="Take Profit (%)" name="take_profit_pct" value={cfg.take_profit_pct as number ?? 100} type="number" min={5} max={10000} onChange={v => set("take_profit_pct", Number(v))} />
      <Field label="Auto Sell (seconds)" name="auto_sell_seconds" value={cfg.auto_sell_seconds as number ?? 300} type="number" min={30} max={86400} step={30} onChange={v => set("auto_sell_seconds", Number(v))} />
      <Field label="Min Liquidity (USD)" name="min_liquidity_usd" value={cfg.min_liquidity_usd as number ?? 5000} type="number" min={100} onChange={v => set("min_liquidity_usd", Number(v))} />
      <Field label="Min RugCheck Score" name="min_rugcheck_score" value={cfg.min_rugcheck_score as number ?? 70} type="number" min={0} max={100} onChange={v => set("min_rugcheck_score", Number(v))} />
    </>
  );
}

function CopyTradeFields({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <Field label="Target Wallet" name="target_wallet" value={cfg.target_wallet as string ?? ""} onChange={v => set("target_wallet", v)} placeholder="Solana address to mirror" />
      <Field label="Max Copy Size (USD)" name="max_copy_size_usd" value={cfg.max_copy_size_usd as number ?? 50} type="number" min={1} onChange={v => set("max_copy_size_usd", Number(v))} />
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Token Blacklist (comma-separated mints)</Label>
        <Input
          className="h-8 text-sm"
          value={(cfg.token_blacklist as string[] ?? []).join(",")}
          onChange={e => set("token_blacklist", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
          placeholder="mint1,mint2,..."
        />
      </div>
    </>
  );
}

function PerpsFields({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Market</Label>
        <select
          className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring h-8"
          value={cfg.market as string ?? "SOL-PERP"}
          onChange={e => set("market", e.target.value)}
        >
          <option value="SOL-PERP">SOL-PERP</option>
          <option value="BTC-PERP">BTC-PERP</option>
          <option value="ETH-PERP">ETH-PERP</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Direction</Label>
        <select
          className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring h-8"
          value={cfg.direction as string ?? "long"}
          onChange={e => set("direction", e.target.value)}
        >
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Entry Mode</Label>
        <select
          className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring h-8"
          value={cfg.entry_mode as string ?? "manual"}
          onChange={e => set("entry_mode", e.target.value)}
        >
          <option value="manual">Manual</option>
          <option value="signal">Signal (EMA+RSI)</option>
        </select>
      </div>
      <Field label="Position Size (USD)" name="position_size_usd" value={cfg.position_size_usd as number ?? 100} type="number" min={1} onChange={v => set("position_size_usd", Number(v))} />
      <Field label="Leverage (1–20×)" name="leverage" value={cfg.leverage as number ?? 3} type="number" min={1} max={20} onChange={v => set("leverage", Number(v))} />
      <Field label="Stop Loss (%)" name="stop_loss_pct" value={cfg.stop_loss_pct as number ?? 5} type="number" min={0.5} max={50} step={0.5} onChange={v => set("stop_loss_pct", Number(v))} />
      <Field label="Take Profit (%)" name="take_profit_pct" value={cfg.take_profit_pct as number ?? 10} type="number" min={0.5} max={500} step={0.5} onChange={v => set("take_profit_pct", Number(v))} />
    </>
  );
}

const CONFIG_FIELDS: Record<StrategyId, React.ComponentType<{ cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }>> = {
  dca: DcaFields,
  swing: SwingFields,
  scalping: ScalpingFields,
  sniping: SniperFields,
  copy_trade: CopyTradeFields,
  perps: PerpsFields,
};

export function StrategyConfigPanel({ strategy, wallets, onSaved }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>({ ...strategy.config });
  const [walletId, setWalletId] = useState<string | null>(strategy.wallet_id);
  const [saving, setSaving] = useState(false);

  const setField = (k: string, v: unknown) => setConfig(prev => ({ ...prev, [k]: v }));

  const Fields = CONFIG_FIELDS[strategy.id as StrategyId];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/strategies/${strategy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, wallet_id: walletId }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json() as Strategy;
      onSaved(updated);
      toast.success("Strategy saved");
    } catch {
      toast.error("Failed to save strategy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <WalletSelector wallets={wallets} value={walletId} onChange={setWalletId} />
      <div className="grid grid-cols-2 gap-3">
        {Fields && <Fields cfg={config} set={setField} />}
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Position Size Override (%)</Label>
        <Input
          type="number" min={1} max={100} step={1} className="h-8 text-sm"
          value={config.max_position_size_pct as number ?? ""}
          placeholder="Use global risk setting"
          onChange={e => setField("max_position_size_pct", e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Config"}
      </Button>
    </div>
  );
}
