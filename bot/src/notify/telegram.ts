import { env } from "../config/env.js";
import { logger } from "../core/logger.js";

async function sendTelegramMessage(text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    logger.warn(err, "Telegram alert failed");
  }
}

export const notify = {
  fill: (symbol: string, side: string, amountUsd: number, txSig: string) =>
    sendTelegramMessage(
      `✅ <b>FILL</b> ${side.toUpperCase()} ${symbol}\n` +
      `💵 $${amountUsd.toFixed(2)}\n` +
      `🔗 <a href="https://solscan.io/tx/${txSig}">View TX</a>`
    ),

  slHit: (symbol: string, pnlUsd: number) =>
    sendTelegramMessage(
      `🛑 <b>STOP LOSS</b> hit on ${symbol}\n📉 PnL: $${pnlUsd.toFixed(2)}`
    ),

  tpHit: (symbol: string, pnlUsd: number) =>
    sendTelegramMessage(
      `🎯 <b>TAKE PROFIT</b> hit on ${symbol}\n📈 PnL: +$${pnlUsd.toFixed(2)}`
    ),

  error: (message: string) =>
    sendTelegramMessage(`⚠️ <b>BOT ERROR</b>\n${message}`),

  circuitBreaker: (reason: string) =>
    sendTelegramMessage(
      `🚨 <b>CIRCUIT BREAKER TRIGGERED</b>\n${reason}\nAll trading paused.`
    ),

  botStarted: () =>
    sendTelegramMessage(`🟢 <b>SolBot started</b>`),

  botStopped: () =>
    sendTelegramMessage(`🔴 <b>SolBot stopped</b>`),
};
