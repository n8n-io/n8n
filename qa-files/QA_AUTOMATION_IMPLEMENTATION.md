# QA Automation Implementation Guide  
*(File: `QA_AUTOMATION_IMPLEMENTATION.md`)*  

This document walks you through **integrating the Telegram-driven Cypress QA pipeline** into your **existing fork of the n8n repository** (`theboukadida92/n8n`).  
It assumes you already own the fork and can push to it.

---

## 0  Prerequisites

| Tool | Version / Note |
|------|----------------|
| Git | any recent version |
| Docker | optional for local test builds |
| Render.com account | Free tier is enough |
| Telegram Bot | Token from BotFather |
| DeepSeek API key | free or paid |
| Application Under Test (AUT) | Publicly reachable base URL |

---

## 1  Clone & Create Branch

```bash
# 1. clone your n8n fork
git clone https://github.com/theboukadida92/n8n.git
cd n8n

# 2. create dedicated feature branch
git checkout -b feat/qa-automation
```

---

## 2  Add QA Automation Skeleton

```
n8n/
├─ qa-automation/
│  ├─ cypress.json
│  ├─ scripts/
│  │  └─ run_cypress.sh
│  ├─ functions/
│  │  ├─ parse-gherkin.js
│  │  ├─ deepseek-prompt.js
│  │  ├─ html-locator-extractor.js
│  │  ├─ inject-locators.js
│  │  └─ report-generator.js
│  ├─ workflows/
│  │  ├─ qa-e2e-workflow.json
│  │  └─ README.md
│  └─ .env.sample
├─ docker/
│  └─ qa-automation/
│     └─ Dockerfile
└─ render.yaml
```

> **Tip:** Copy the files supplied in this repository’s `qa-automation` folder into the same paths inside your n8n fork.

---

## 3  Commit Files

```bash
git add qa-automation docker/qa-automation render.yaml
git commit -m "feat: integrate QA automation pipeline (Telegram → Cypress)"
git push -u origin feat/qa-automation
```

Create a pull-request and merge into **main** (Render auto-deploys from `main`).

---

## 4  Configure Environment

### 4.1  Render Environment Group  

Create **Environment Group** `n8n-qa-secrets` and add:

| Key | Value |
|-----|-------|
| N8N_ENCRYPTION_KEY | 32-char random |
| N8N_BASIC_AUTH_USER / PASSWORD | UI login |
| JWT_SECRET | random |
| TELEGRAM_BOT_TOKEN | BotFather token |
| TELEGRAM_ALLOWED_CHAT_IDS | `12345678,987654321` (optional) |
| DEEPSEEK_API_KEY | your key |
| CYPRESS_BASE_URL | `https://app-under-test.com` |

### 4.2  Local `.env`

For local runs copy `qa-automation/.env.sample` → `.env` and fill values.

---

## 5  Deploy to Render

1. **Create new Web Service**  
   • repo: `theboukadida92/n8n`  
   • branch: **main**  
   • environment: **Docker**  
   • autodetect blueprint → `render.yaml`

2. **First build** (~5 min) downloads Cypress.

3. After deploy, open `https://<service>.onrender.com` and log in with basic-auth.

---

## 6  Import Workflow

1. n8n UI → *Workflows ▸ Import from File*  
2. Select `qa-automation/workflows/qa-e2e-workflow.json`.  
3. Create credentials:

   * **Telegram Bot API** – paste `TELEGRAM_BOT_TOKEN`.  
   * **HTTP Header Auth** – name it **DeepSeek API Auth** →  
     Header `Authorization` = `Bearer <DEEPSEEK_API_KEY>`.

4. Activate the workflow.

---

## 7  First Test Drive

1. In Telegram chat send:

   ```
   Feature: Health check
   Scenario: Open home page
     Given I am on the home page
     Then the title should contain "Welcome"
   ```

2. Bot replies with  
   • ✅ success message  
   • 📄 `test-<timestamp>.spec.js` file  
   • ⏱ executes Cypress, then sends 📊 HTML report.

If you instead receive an error, see Section 8.

---

## 8  Troubleshooting

| Bot Reply | Likely Cause | Fix |
|-----------|--------------|-----|
| `Invalid Gherkin` | Missing Feature/Scenario/steps | Provide full BDD block |
| `Code Generation Failed` | DeepSeek quota / LLM glitch | Resend, simplify spec |
| No reply | Wrong bot token / Render sleeping | Verify token, check Render logs |
| Placeholders not replaced | Locator extractor found <1 element | Add `data-testid` to AUT |

Logs: **Render ➜ Logs** or n8n *Executions* tab.

---

## 9  Maintaining the Pipeline

| Task | Frequency | Command / Action |
|------|-----------|------------------|
| Update base n8n version | monthly | bump tag in `docker/qa-automation/Dockerfile` |
| Clear old reports | auto (script) | `run_cypress.sh` cleans `/tmp` |
| DB backup | daily | cron job in `render.yaml` |
| LLM prompt tweaks | as needed | edit functions in `qa-automation/functions/` |

---

## 10  Extending

* **Multiple Channels** – duplicate Telegram trigger with different bot token.  
* **CI Regression** – schedule Cron node calling Cypress runner nightly.  
* **SPA Locator Extraction** – swap *Fetch HTML* with Puppeteer for dynamic pages.  
* **Slack Support** – replace Telegram nodes with Slack connector.

---

## 11  Checklist Recap

- [ ] Branch `feat/qa-automation` merged  
- [ ] Files added under `qa-automation/` & `docker/qa-automation/`  
- [ ] Secrets stored in Render Environment Group  
- [ ] Service deployed from `render.yaml`  
- [ ] Workflow imported & credentials set  
- [ ] First Gherkin test passes ✔️  

---

**Enjoy autonomous QA directly from your chat!**  
Maintainer: **Mohamed Boukadida**   |   *QA Engineer / Automation Developer*
