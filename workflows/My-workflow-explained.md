# My workflow — Explanation and publishable post

## Short summary
This n8n workflow accepts an incoming POST webhook with a user message, sends that message to an LLM endpoint (via an HTTP Request node), then forwards the LLM's reply to a Telegram chat. It is intended to implement a simple Arabic assistant: the LLM is configured to reply in Arabic and in a friendly, simple style.

---

## How it works (step‑by‑step)
1. Webhook node (Webhook)
   - Listens for HTTP POST requests at path `/advice`.
   - Receives JSON payloads that contain the user's message under `body.message.text` (per the current configuration).

2. HTTP Request to LLM (HTTP Request1)
   - Sends a POST request to an LLM API endpoint (`https://api.groq.com/openai/v1/chat/completions` in the JSON).
   - The request uses a JSON body containing:
     - system message instructing the assistant to respond in Arabic, friendly and simple;
     - user message pulled dynamically from the webhook: `={{ $node["Webhook"].json.body.message.text }}`;
     - the model selector (e.g., `llama-3.3-70b-versatile`).
   - The Authorization header must include a valid API key (do NOT store this key directly in the workflow JSON — use n8n Credentials or environment variables).

3. HTTP Request to Telegram (HTTP Request)
   - Sends a POST request to the Telegram Bot API `sendMessage` endpoint.
   - Uses `chat_id` (the target chat) and `text` which is set to the assistant reply extracted from the LLM response:
     `={{ $node["HTTP Request1"].json.choices[0].message.content }}`
   - Replace the bot token in the URL with a credential, not a literal token in the workflow.

4. Flow
   - Webhook → HTTP Request1 → HTTP Request

---

## Important security notes (must read)
- The workflow you provided originally contained plain tokens/IDs (Authorization header and Telegram bot token). These are sensitive secrets.
- DO NOT commit secrets (API keys, bot tokens, chat IDs) to a public repository.
- Use n8n Credentials (Credentials > create a new credential) or environment variables to store:
  - LLM API key
  - Telegram bot token
  - Any other secrets
- If the tokens in your provided workflow are real, rotate them immediately (delete/regenerate) because they were exposed.

---

## How to import this workflow into n8n (UI)
1. In n8n, go to Workflows → Import.
2. Paste the (sanitized) JSON or upload the file.
3. Create credentials:
   - Add a credential for your LLM API key (e.g., `groqApiKey`).
   - Add a credential or env var for your Telegram bot token and chat ID.
4. Edit the HTTP Request nodes:
   - LLM node: Header Authorization uses `={{ 'Bearer ' + $credentials.groqApiKey }}`.
   - Telegram node: URL uses `={{ 'https://api.telegram.org/bot' + $credentials.telegramBotToken + '/sendMessage' }}`.
5. Test the webhook:
   - Copy the webhook URL shown in the Webhook node (it includes your instance hostname).
   - Example test payload:
     {
       "message": {
         "text": "مرحبا! كيف حالك؟"
       }
     }
   - Send with curl:
     `curl -X POST <YOUR_WEBHOOK_URL>/advice -H "Content-Type: application/json" -d '{"message":{"text":"مرحبا"}}'`

---

## Suggestions & improvements
- Add error handling (Switch/If nodes).
- Trim/sanitize LLM output before sending to Telegram.
- Store interactions for logging or analytics.
- Add moderation step before sending to users.

---

## Publishable short post (ready)
Title: "Arabic Assistant: webhook → LLM → Telegram using n8n"

Post:
I built a simple n8n workflow that accepts a POST webhook, sends the incoming message to an LLM, and forwards the reply to Telegram. It’s a quick way to build an Arabic helper bot that replies in a friendly, simple style.

Security: never store API keys or bot tokens in workflow JSON. Use n8n credentials or environment variables instead.

Want this workflow added to the repo and a PR opened? I can do that for you.
