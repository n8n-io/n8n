# QA-Automation Workflow Guide

This guide explains how to import and configure the QA-Automation Workflow for n8n.

## Prerequisites

- n8n instance with custom Docker image (includes Cypress, Chrome, etc.)
- Environment variables set up (see `.env.sample`)
- Telegram Bot token (create one via @BotFather)
- DeepSeek API key (for code generation)
- Cypress AUT URL (the application under test)

## Importing the Workflow

1. Go to your n8n instance
2. Navigate to Workflows
3. Click "Import from File"
4. Select the `qa-e2e-workflow.json` file from the `workflows` directory
5. Save the workflow

## Configuring Credentials

### Telegram Bot API

1. Create a new credential of type "Telegram API"
2. Enter your bot token from @BotFather
3. Save the credential
4. Assign this credential to the Telegram Trigger node

### DeepSeek HTTP Header Auth

1. Create a new credential of type "HTTP Header Auth"
2. Set the name to "DeepSeek API Key"
3. Add a header with name "Authorization" and value "Bearer YOUR_DEEPSEEK_API_KEY"
4. Save the credential
5. Assign this credential to the DeepSeek API node

### Extra HTTP Credentials (Optional)

- If your AUT requires authentication, create appropriate HTTP credentials
- Assign these to the Fetch HTML node

## Node-Level Settings

### Telegram Trigger

- Ensure webhook mode is enabled
- Set polling interval if using polling mode

### DeepSeek API

- Verify the model is set to "deepseek-coder"
- Temperature should be around 0.2-0.3 for consistent results

### Fetch HTML

- Update the URL to point to your application under test
- Add any required authentication headers

## Activating and Testing

1. Activate the workflow
2. Send a Gherkin snippet to your bot
3. Example:
   ```gherkin
   Feature: Login Functionality
   
   Scenario: Successful Login
     Given I am on the login page
     When I enter valid credentials
     And I click the login button
     Then I should be logged in successfully
   ```
4. The bot should respond with generated Cypress code

## Troubleshooting

- If the bot doesn't respond, check n8n logs
- Verify your Telegram token is correct
- Ensure DeepSeek API key is valid and has sufficient quota
- Check that the AUT URL is accessible from your n8n instance

---

## Maintenance Tasks

* **Pull upstream repo** when fixes land:  
  ```bash
  git pull origin main && git push
  ```  
  Render redeploys automatically.
* For **n8n version bumps**, rebuild Docker image:  
  `docker build -f docker/qa-automation/Dockerfile .`

---

## Troubleshooting Quick-ref

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| `Invalid Gherkin` reply | Missing *Feature/Scenario* | Send full BDD block |
| `Code Generation Failed` | DeepSeek quota / bad prompt | Retry, simplify spec |
| No reply at all | Telegram token wrong or n8n asleep | Verify token, check Render logs |
| Selector placeholders remain in code | HTML extractor couldn't match | Add `data-testid` to AUT |

---

**Enjoy autonomous E2E testing directly from Telegram!**  
For support, open an issue in the repository or ping `@boukadida92`.