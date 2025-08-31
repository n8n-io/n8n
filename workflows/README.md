# Telegram Crypto Alerts — Daily Gainers/Losers + Watchlist + Memecoins (n8n)

**Publisher:** Oldest2905

## 🚀 What it does
- Sends a daily snapshot at 09:00 Africa/Lagos: *Top 5 Gainers/Losers (24h)*
- Builds *Speculative Watchlist* and *Memecoin Watchlist*
- On-demand commands: `/topcoins`, `/airdrops`, `/watchlist`, `/memecoins`
- CoinGecko (primary) with CoinPaprika failover

## ⚙️ Setup
1. Import `workflow.json` into n8n.
2. Create a Telegram credential named `{TELEGRAM_CREDENTIAL_NAME}`.
3. Set `{TELEGRAM_CHAT_ID}` or wire the chatId from the Trigger node.
4. Test with `/topcoins`, then run the Cron node once. Activate when satisfied.

## 📝 Notes
- Always-on lists (resilient normalization; no empty output)
- Not financial advice.