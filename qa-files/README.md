# QA-Automation Workflow — Import & Configuration Guide
*(Directory: `qa-automation/workflows/`)*

Welcome 👋  
This document explains how to **import** the `qa-e2e-workflow.json` into your n8n instance and configure the credentials and settings required for the Telegram-driven Cypress QA automation pipeline.

---

## 1. Prerequisites

| Item | Minimum requirement | Where to set |
|------|--------------------|--------------|
| **n8n instance** | Any ≥ v1.45 with the custom QA Docker image (`docker/qa-automation/Dockerfile`) | Render.com or local Docker |
| **Environment variables** | Values from `.env` / Render secrets | Container / Render |
| **Telegram Bot** | Token from BotFather | Render secret `TELEGRAM_BOT_TOKEN` |
| **DeepSeek API key** | Free/paid key | Render secret `DEEPSEEK_API_KEY` |
| **Cypress AUT URL** | Base URL you want to test | `CYPRESS_BASE_URL` env var |

> **Tip:** All secrets can be stored in a single Render **Environment Group** (e.g. `n8n-qa-secrets`) referenced in `render.yaml`.

---

## 2. Importing the Workflow

1. **Open n8n UI**  
   Navigate to `https://<your-n8n-host>/` and log in with Basic-Auth credentials.

2. **Import**  
   • Click *Workflows ▸ Import from File*  
   • Select `qa-automation/workflows/qa-e2e-workflow.json`  
   • Save—keep the default name or rename as you wish.

3. The workflow appears in the list but is **inactive** by default.

---

## 3. Configure Credentials

### 3.1 Telegram Bot API
1. Go to **Credentials ▸ New ▸ Telegram Bot API**.  
2. **Token**: paste the value of `TELEGRAM_BOT_TOKEN`.  
3. (Optional) Restrict to `TELEGRAM_ALLOWED_CHAT_IDS`.

### 3.2 DeepSeek HTTP Header Auth
1. **Credentials ▸ New ▸ HTTP Header Auth**  
2. **Name**: `DeepSeek API Auth` (must match the workflow).  
3. **Header Name**: `Authorization`  
4. **Value**: `Bearer <YOUR_DEEPSEEK_API_KEY>`  

### 3.3 (Optional) Extra HTTP Credentials
If the page under test requires authentication (Basic Auth, Cookie, etc.), create additional credentials and reference them inside the **Fetch HTML** HTTP Request node.

---

## 4. Node-level Settings

| Node | Must check |
|------|------------|
| **Telegram Trigger** | Poll interval, allowed updates, credentials select |
| **DeepSeek API** | *Generic HTTP Header Auth* credential = `DeepSeek API Auth` |
| **Fetch HTML** | URL default: `{{$json["targetUrl"]}}`. Ensure `CYPRESS_BASE_URL` is defined when `cy.visit()` uses env variable |

No other manual edits are usually required—placeholders are filled dynamically by the Function nodes.

---

## 5. Activate & Test

1. **Activate** the workflow (toggle in top-right).  
2. **Send** a simple Gherkin snippet to the bot, e.g.:

   ```
   Feature: Ping
   Scenario: Visit homepage
     Given I am on the home page
     Then the title should contain "Welcome"
   ```

3. Watch the chat:
   * Bot validates Gherkin → sends `.spec.js` file.
   * A second message arrives with summary + HTML report.

If you do **not** receive messages:
* Check n8n **Executions** tab for errors.  
* Verify Render logs (Out-of-memory, bad token, etc.).

---

## 6. Optional Tweaks

| Need | Where |
|------|-------|
| Adjust poll frequency | Telegram Trigger ▸ *Poll Times* |
| Change DeepSeek temperature | Env var `DEEPSEEK_TEMPERATURE` |
| Keep execution data longer | Env vars `EXECUTIONS_DATA_MAX_AGE`, `...PRUNE...` |
| Run nightly regression | Add Cron node inside a separate workflow invoking `Run Cypress Test` script against stored specs |

---

## 7. Updating the Workflow

* **Pull upstream repo** when fixes land:  
  ```bash
  git pull origin main && git push
  ```  
  Render redeploys automatically.
* For **n8n version bumps**, rebuild Docker image:  
  `docker build -f docker/qa-automation/Dockerfile .`

---

## 8. Troubleshooting Quick-ref

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| `Invalid Gherkin` reply | Missing *Feature/Scenario* | Send full BDD block |
| `Code Generation Failed` | DeepSeek quota / bad prompt | Retry, simplify spec |
| No reply at all | Telegram token wrong or n8n asleep | Verify token, check Render logs |
| Selector placeholders remain in code | HTML extractor couldn’t match | Add `data-testid` to AUT |

---

**Enjoy autonomous E2E testing directly from Telegram!**  
For support, open an issue in the repository or ping `@boukadida92`. 
