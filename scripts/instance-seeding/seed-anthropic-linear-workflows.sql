-- =============================================================================
-- Seed: Anthropic + Linear workflow estate
-- =============================================================================
--
-- Fills an n8n instance with eight small, realistic workflows so a fresh
-- account has something to look at: an intake webhook, two scheduled digests,
-- a chat assistant, a classifier fan-out, a stale-issue nudger, a notes-to-
-- tasks run, and an error handler.
--
-- The estate is deliberately biased. Every workflow uses the Anthropic chat
-- model, and every workflow touches Linear. Where n8n offers more than one node
-- for a job, one was chosen and used everywhere -- the full list is under
-- "Choices made" below. Extending this file means following that list, not
-- picking again.
--
-- -----------------------------------------------------------------------------
-- What it does not do
-- -----------------------------------------------------------------------------
--
--   * No credentials. Credential secrets are encrypted with the instance
--     encryption key, which no portable SQL file can produce. Nodes are seeded
--     with no credential attached; create one Anthropic and one Linear
--     credential in the UI, then run the optional linking section at the end to
--     attach them everywhere at once.
--   * Nothing is activated. Every workflow lands inactive, so no schedule fires
--     and no webhook registers on an instance you did not mean to wake up.
--   * No outbound calls to anything real. The one HTTP Request node posts to
--     https://example.invalid, which cannot resolve.
--   * No Linear team is chosen. `teamId` is empty on every Linear node, so the
--     UI shows its team picker rather than a wrong id.
--
-- -----------------------------------------------------------------------------
-- Running it
-- -----------------------------------------------------------------------------
--
-- Requires an instance that has already started once, so the schema exists, and
-- an empty DB_TABLE_PREFIX. Both engines are supported, with one substitution.
--
--   SQLite (the default):
--     sqlite3 ~/.n8n/database.sqlite < seed-anthropic-linear-workflows.sql
--
--   PostgreSQL: replace every
--       DATETIME('now', '-N days')     with   NOW() - INTERVAL 'N days'
--       DATETIME('now', '-N minutes')  with   NOW() - INTERVAL 'N minutes'
--     then
--     psql "$DATABASE_URL" -f seed-anthropic-linear-workflows.sql
--
-- Restart n8n afterwards, or reload the workflow list -- n8n caches nothing
-- here, but an open tab will not notice new rows on its own.
--
-- Re-running is safe. The DELETE statements below remove only this file's own
-- rows, matched on the `seedAlWf%` id prefix. Note that
-- `scripts/instance-seeding/seedInstance.mjs` clears on the prefix `[seed] `
-- (with a trailing space), so its cleanup will not touch these `[seed-al]`
-- workflows, and this file will not touch its.
--
-- -----------------------------------------------------------------------------
-- Choices made
-- -----------------------------------------------------------------------------
--
-- Every job below has more than one node that could do it. One was picked and
-- used consistently. Keep to this table when adding workflows.
--
--   Job                        Chosen                          Type / version
--   -------------------------  ------------------------------  ----------------
--   Chat model                 Anthropic Chat Model            @n8n/n8n-nodes-langchain.lmChatAnthropic @1.5
--   Model id                   claude-sonnet-4-6               resource locator, list mode
--   Issue tracker              Linear                          n8n-nodes-base.linear @1.1
--   Linear auth                API token                       authentication: apiToken
--   Linear as an agent tool    Linear Tool                     n8n-nodes-base.linearTool @1.1
--   Agent                      Tools Agent                     @n8n/n8n-nodes-langchain.agent @1.3
--   Chat memory                Simple Memory                   @n8n/n8n-nodes-langchain.memoryBufferWindow @1.4
--   Field extraction           Information Extractor           @n8n/n8n-nodes-langchain.informationExtractor @1.2
--   Routing on free text       Text Classifier                 @n8n/n8n-nodes-langchain.textClassifier @1.1
--   One-shot prompting         Basic LLM Chain                 @n8n/n8n-nodes-langchain.chainLlm @1.9
--   Two-way branch             If                              n8n-nodes-base.if @2.3
--   Dropping items             Filter                          n8n-nodes-base.filter @2.3
--   Per-item side effects      Loop Over Items, batch size 1   n8n-nodes-base.splitInBatches @3
--   Many items into one        Aggregate                       n8n-nodes-base.aggregate @1
--   Field shaping              Edit Fields                     n8n-nodes-base.set @3.5
--   Outbound HTTP              HTTP Request                    n8n-nodes-base.httpRequest @4.5
--   Inbound HTTP               Webhook                         n8n-nodes-base.webhook @2.1
--   Webhook reply              Respond to Webhook              n8n-nodes-base.respondToWebhook @1.5
--   Chat entry point           Chat Trigger                    @n8n/n8n-nodes-langchain.chatTrigger @1.4
--   Scheduled entry point      Schedule Trigger, cron mode     n8n-nodes-base.scheduleTrigger @1.4
--   Manual entry point         Manual Trigger                  n8n-nodes-base.manualTrigger @1
--   Failure entry point        Error Trigger                   n8n-nodes-base.errorTrigger @1
--   On-canvas notes            Sticky Note                     n8n-nodes-base.stickyNote @1
--
-- Passed over, for the record: OpenAI, Gemini, Azure OpenAI, Ollama, Groq,
-- Mistral and Bedrock chat models; Jira, GitHub Issues, Asana, ClickUp, Trello
-- and Notion as the tracker; Linear OAuth2; Redis, Postgres, MongoDB and Zep
-- chat memory; Switch instead of If; Code instead of Edit Fields, Filter,
-- Aggregate or a loop; Cron and Interval triggers; Form Trigger for inbound
-- HTTP; Python in any Code node. No Code node appears at all -- every
-- transformation here is expressible with a configured node, which is the
-- choice worth keeping.
--
-- Two node-wiring rules are followed throughout and are easy to break by
-- accident when editing: a node that writes to an API outputs that API's
-- response, not the data that flowed in, so the nudge and notes workflows read
-- their ids back from the loop node by name rather than from `$json`; and any
-- node that should run once for a whole batch rather than once per item carries
-- `executeOnce`.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Clean up a previous run of this file
-- -----------------------------------------------------------------------------

DELETE FROM "shared_workflow" WHERE "workflowId" LIKE 'seedAlWf%';
DELETE FROM "workflow_entity" WHERE "id" LIKE 'seedAlWf%';


-- -----------------------------------------------------------------------------
-- Workflows
-- -----------------------------------------------------------------------------
--
-- Each is owned by the first personal project on the instance, which on a fresh
-- account is the owner's own. Change the sub-select if you want them elsewhere.

-- 1. [seed-al] Bug report intake to Linear
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000001',
  '[seed-al] Bug report intake to Linear',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {
      "httpMethod": "POST",
      "path": "seed-al-bug-report",
      "responseMode": "responseNode",
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000101",
    "name": "Bug Report Webhook",
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2.1,
    "position": [
      -220,
      0
    ],
    "webhookId": "a1000000-0000-4000-8000-0000000001aa"
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000102",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      60,
      200
    ]
  },
  {
    "parameters": {
      "text": "={{ $json.body.message }}",
      "schemaType": "fromAttributes",
      "attributes": {
        "attributes": [
          {
            "name": "summary",
            "type": "string",
            "description": "One sentence describing the problem",
            "required": true
          },
          {
            "name": "component",
            "type": "string",
            "description": "Which part of the product is affected",
            "required": true
          },
          {
            "name": "severity",
            "type": "string",
            "description": "One of high, medium or low",
            "required": true
          }
        ]
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000103",
    "name": "Extract Report Fields",
    "type": "@n8n/n8n-nodes-langchain.informationExtractor",
    "typeVersion": 1.2,
    "position": [
      0,
      0
    ]
  },
  {
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": false,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "id": "a1c1",
            "operator": {
              "type": "string",
              "operation": "equals"
            },
            "leftValue": "={{ $json.output.severity }}",
            "rightValue": "high"
          }
        ],
        "combinator": "and"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000104",
    "name": "Is It Urgent",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.3,
    "position": [
      220,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "={{ $json.output.summary }}",
      "additionalFields": {
        "description": "=Component: {{ $json.output.component }}\nReported through the bug intake webhook.",
        "priorityId": 1
      }
    },
    "id": "a1000000-0000-4000-8000-000000000105",
    "name": "Create Urgent Bug",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      440,
      -100
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "={{ $json.output.summary }}",
      "additionalFields": {
        "description": "=Component: {{ $json.output.component }}\nReported through the bug intake webhook.",
        "priorityId": 3
      }
    },
    "id": "a1000000-0000-4000-8000-000000000106",
    "name": "Create Backlog Bug",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      440,
      120
    ]
  },
  {
    "parameters": {
      "respondWith": "json",
      "responseBody": "={{ { \"issue\": $json.identifier } }}",
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000107",
    "name": "Acknowledge Report",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.5,
    "position": [
      680,
      0
    ]
  },
  {
    "parameters": {
      "content": "## Bug intake\nA POST body with a free text message becomes a triaged Linear issue.\nUrgent reports get priority 1, everything else lands in the backlog.",
      "width": 300,
      "height": 160
    },
    "id": "a1000000-0000-4000-8000-000000000108",
    "name": "Sticky Note",
    "type": "n8n-nodes-base.stickyNote",
    "typeVersion": 1,
    "position": [
      -260,
      -220
    ]
  }
]',
  '{
  "Bug Report Webhook": {
    "main": [
      [
        {
          "node": "Extract Report Fields",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Extract Report Fields": {
    "main": [
      [
        {
          "node": "Is It Urgent",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Is It Urgent": {
    "main": [
      [
        {
          "node": "Create Urgent Bug",
          "type": "main",
          "index": 0
        }
      ],
      [
        {
          "node": "Create Backlog Bug",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Create Urgent Bug": {
    "main": [
      [
        {
          "node": "Acknowledge Report",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Create Backlog Bug": {
    "main": [
      [
        {
          "node": "Acknowledge Report",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Extract Report Fields",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000001',
  1,
  0,
  '[]',
  DATETIME('now', '-13 days'),
  DATETIME('now', '-11 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000001', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-13 days'), DATETIME('now', '-11 days'));

-- 2. [seed-al] Daily Linear standup digest
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000002',
  '[seed-al] Daily Linear standup digest',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "cronExpression",
            "expression": "0 9 * * 1-5"
          }
        ]
      }
    },
    "id": "a1000000-0000-4000-8000-000000000201",
    "name": "Every Weekday At 9",
    "type": "n8n-nodes-base.scheduleTrigger",
    "typeVersion": 1.4,
    "position": [
      -220,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "getAll",
      "returnAll": false,
      "limit": 50
    },
    "id": "a1000000-0000-4000-8000-000000000202",
    "name": "Get Recent Issues",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      0,
      0
    ]
  },
  {
    "parameters": {
      "aggregate": "aggregateAllItemData",
      "destinationFieldName": "issues",
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000203",
    "name": "Collect Issues",
    "type": "n8n-nodes-base.aggregate",
    "typeVersion": 1,
    "position": [
      220,
      0
    ]
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000204",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      480,
      200
    ]
  },
  {
    "parameters": {
      "promptType": "define",
      "text": "=Write a short standup digest from this Linear issue list. Group by state and keep it under 200 words.\n\n{{ JSON.stringify($json.issues) }}",
      "messages": {}
    },
    "id": "a1000000-0000-4000-8000-000000000205",
    "name": "Write The Digest",
    "type": "@n8n/n8n-nodes-langchain.chainLlm",
    "typeVersion": 1.9,
    "position": [
      440,
      0
    ],
    "executeOnce": true
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "comment",
      "operation": "addComment",
      "issueId": "",
      "comment": "={{ $json.text }}",
      "additionalFields": {}
    },
    "id": "a1000000-0000-4000-8000-000000000206",
    "name": "Post Digest Comment",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      680,
      0
    ],
    "executeOnce": true
  }
]',
  '{
  "Every Weekday At 9": {
    "main": [
      [
        {
          "node": "Get Recent Issues",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Get Recent Issues": {
    "main": [
      [
        {
          "node": "Collect Issues",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Collect Issues": {
    "main": [
      [
        {
          "node": "Write The Digest",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Write The Digest": {
    "main": [
      [
        {
          "node": "Post Digest Comment",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Write The Digest",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000002',
  1,
  0,
  '[]',
  DATETIME('now', '-12 days'),
  DATETIME('now', '-6 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000002', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-12 days'), DATETIME('now', '-6 days'));

-- 3. [seed-al] Support assistant with Linear escalation
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000003',
  '[seed-al] Support assistant with Linear escalation',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000301",
    "name": "When Chat Message Received",
    "type": "@n8n/n8n-nodes-langchain.chatTrigger",
    "typeVersion": 1.4,
    "position": [
      -220,
      0
    ],
    "webhookId": "a1000000-0000-4000-8000-0000000003aa"
  },
  {
    "parameters": {
      "promptType": "auto",
      "options": {
        "systemMessage": "You are a support assistant. Answer from what the user tells you. When something is a genuine defect or needs engineering work, escalate it by creating a Linear issue with a clear title and a short description. Never escalate a question you can answer."
      }
    },
    "id": "a1000000-0000-4000-8000-000000000302",
    "name": "Support Agent",
    "type": "@n8n/n8n-nodes-langchain.agent",
    "typeVersion": 1.3,
    "position": [
      20,
      0
    ]
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000303",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      -80,
      220
    ]
  },
  {
    "parameters": {},
    "id": "a1000000-0000-4000-8000-000000000304",
    "name": "Simple Memory",
    "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
    "typeVersion": 1.4,
    "position": [
      100,
      220
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "={{ $fromAI(\"title\", \"A short issue title\", \"string\") }}",
      "additionalFields": {
        "description": "={{ $fromAI(\"description\", \"What the user reported and why it needs engineering\", \"string\") }}"
      },
      "descriptionType": "manual",
      "toolDescription": "Create a Linear issue when something needs engineering work"
    },
    "id": "a1000000-0000-4000-8000-000000000305",
    "name": "create_issue",
    "type": "n8n-nodes-base.linearTool",
    "typeVersion": 1.1,
    "position": [
      280,
      220
    ]
  },
  {
    "parameters": {
      "content": "## Support assistant\nAnswers from the conversation and escalates real defects into Linear.\nMemory keeps the last few turns so follow ups make sense.",
      "width": 300,
      "height": 160
    },
    "id": "a1000000-0000-4000-8000-000000000306",
    "name": "Sticky Note",
    "type": "n8n-nodes-base.stickyNote",
    "typeVersion": 1,
    "position": [
      -260,
      -240
    ]
  }
]',
  '{
  "When Chat Message Received": {
    "main": [
      [
        {
          "node": "Support Agent",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Support Agent",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  },
  "Simple Memory": {
    "ai_memory": [
      [
        {
          "node": "Support Agent",
          "type": "ai_memory",
          "index": 0
        }
      ]
    ]
  },
  "create_issue": {
    "ai_tool": [
      [
        {
          "node": "Support Agent",
          "type": "ai_tool",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000003',
  1,
  0,
  '[]',
  DATETIME('now', '-9 days'),
  DATETIME('now', '-1 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000003', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-9 days'), DATETIME('now', '-1 days'));

-- 4. [seed-al] Route feature requests by theme
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000004',
  '[seed-al] Route feature requests by theme',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {
      "httpMethod": "POST",
      "path": "seed-al-feature-request",
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000401",
    "name": "Feature Request Webhook",
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2.1,
    "position": [
      -220,
      0
    ],
    "webhookId": "a1000000-0000-4000-8000-0000000004aa"
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000402",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      60,
      220
    ]
  },
  {
    "parameters": {
      "inputText": "={{ $json.body.request }}",
      "categories": {
        "categories": [
          {
            "category": "integrations",
            "description": "Asks for a new connector or a change to an existing one"
          },
          {
            "category": "reporting",
            "description": "Asks for dashboards, exports or analytics"
          },
          {
            "category": "platform",
            "description": "Asks for performance, reliability or access control work"
          }
        ]
      },
      "options": {
        "fallback": "other"
      }
    },
    "id": "a1000000-0000-4000-8000-000000000403",
    "name": "Classify Request",
    "type": "@n8n/n8n-nodes-langchain.textClassifier",
    "typeVersion": 1.1,
    "position": [
      0,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "={{ $json.body.request.slice(0, 80) }}",
      "additionalFields": {
        "description": "=Theme: integrations\n\n{{ $json.body.request }}",
        "priorityId": 3
      }
    },
    "id": "a1000000-0000-4000-8000-000000000404",
    "name": "File Integrations Request",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      240,
      -160
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "={{ $json.body.request.slice(0, 80) }}",
      "additionalFields": {
        "description": "=Theme: reporting\n\n{{ $json.body.request }}",
        "priorityId": 3
      }
    },
    "id": "a1000000-0000-4000-8000-000000000405",
    "name": "File Reporting Request",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      240,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "={{ $json.body.request.slice(0, 80) }}",
      "additionalFields": {
        "description": "=Theme: platform\n\n{{ $json.body.request }}",
        "priorityId": 3
      }
    },
    "id": "a1000000-0000-4000-8000-000000000406",
    "name": "File Platform Request",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      240,
      160
    ]
  }
]',
  '{
  "Feature Request Webhook": {
    "main": [
      [
        {
          "node": "Classify Request",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Classify Request": {
    "main": [
      [
        {
          "node": "File Integrations Request",
          "type": "main",
          "index": 0
        }
      ],
      [
        {
          "node": "File Reporting Request",
          "type": "main",
          "index": 0
        }
      ],
      [
        {
          "node": "File Platform Request",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Classify Request",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000004',
  1,
  0,
  '[]',
  DATETIME('now', '-8 days'),
  DATETIME('now', '-7 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000004', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-8 days'), DATETIME('now', '-7 days'));

-- 5. [seed-al] Weekly Linear cycle report
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000005',
  '[seed-al] Weekly Linear cycle report',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "cronExpression",
            "expression": "0 8 * * 1"
          }
        ]
      }
    },
    "id": "a1000000-0000-4000-8000-000000000501",
    "name": "Every Monday At 8",
    "type": "n8n-nodes-base.scheduleTrigger",
    "typeVersion": 1.4,
    "position": [
      -220,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "getAll",
      "returnAll": false,
      "limit": 100
    },
    "id": "a1000000-0000-4000-8000-000000000502",
    "name": "Get Cycle Issues",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      0,
      0
    ]
  },
  {
    "parameters": {
      "aggregate": "aggregateAllItemData",
      "destinationFieldName": "issues",
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000503",
    "name": "Collect Issues",
    "type": "n8n-nodes-base.aggregate",
    "typeVersion": 1,
    "position": [
      220,
      0
    ]
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000504",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      480,
      220
    ]
  },
  {
    "parameters": {
      "promptType": "define",
      "text": "=Write a weekly engineering report from this Linear issue list. Cover what shipped, what slipped and what is at risk. Keep it under 300 words.\n\n{{ JSON.stringify($json.issues) }}",
      "messages": {}
    },
    "id": "a1000000-0000-4000-8000-000000000505",
    "name": "Write The Report",
    "type": "@n8n/n8n-nodes-langchain.chainLlm",
    "typeVersion": 1.9,
    "position": [
      440,
      0
    ],
    "executeOnce": true
  },
  {
    "parameters": {
      "mode": "manual",
      "assignments": {
        "assignments": [
          {
            "id": "a5s1",
            "name": "title",
            "type": "string",
            "value": "Weekly engineering report"
          },
          {
            "id": "a5s2",
            "name": "body",
            "type": "string",
            "value": "={{ $json.text }}"
          },
          {
            "id": "a5s3",
            "name": "generatedAt",
            "type": "string",
            "value": "={{ $now.toISO() }}"
          }
        ]
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000506",
    "name": "Shape The Payload",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.5,
    "position": [
      680,
      0
    ]
  },
  {
    "parameters": {
      "method": "POST",
      "url": "https://example.invalid/reports",
      "sendBody": true,
      "specifyBody": "json",
      "jsonBody": "={{ JSON.stringify($json) }}",
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000507",
    "name": "Post To Report Sink",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.5,
    "position": [
      900,
      0
    ]
  },
  {
    "parameters": {
      "content": "## Replace the sink URL\nThe report is posted to an unroutable placeholder so a fresh seed cannot call anything real.\nSwap in your own endpoint before running this.",
      "width": 300,
      "height": 160
    },
    "id": "a1000000-0000-4000-8000-000000000508",
    "name": "Sticky Note",
    "type": "n8n-nodes-base.stickyNote",
    "typeVersion": 1,
    "position": [
      860,
      -220
    ]
  }
]',
  '{
  "Every Monday At 8": {
    "main": [
      [
        {
          "node": "Get Cycle Issues",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Get Cycle Issues": {
    "main": [
      [
        {
          "node": "Collect Issues",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Collect Issues": {
    "main": [
      [
        {
          "node": "Write The Report",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Write The Report": {
    "main": [
      [
        {
          "node": "Shape The Payload",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Shape The Payload": {
    "main": [
      [
        {
          "node": "Post To Report Sink",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Write The Report",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000005',
  1,
  0,
  '[]',
  DATETIME('now', '-6 days'),
  DATETIME('now', '-5 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000005', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-6 days'), DATETIME('now', '-5 days'));

-- 6. [seed-al] Nudge stale Linear issues
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000006',
  '[seed-al] Nudge stale Linear issues',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "cronExpression",
            "expression": "0 7 * * *"
          }
        ]
      }
    },
    "id": "a1000000-0000-4000-8000-000000000601",
    "name": "Every Morning At 7",
    "type": "n8n-nodes-base.scheduleTrigger",
    "typeVersion": 1.4,
    "position": [
      -220,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "getAll",
      "returnAll": false,
      "limit": 100
    },
    "id": "a1000000-0000-4000-8000-000000000602",
    "name": "Get Open Issues",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      0,
      0
    ]
  },
  {
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "loose",
          "version": 2
        },
        "conditions": [
          {
            "id": "a6f1",
            "operator": {
              "type": "dateTime",
              "operation": "before"
            },
            "leftValue": "={{ $json.updatedAt }}",
            "rightValue": "={{ $now.minus(14, \"days\").toISO() }}"
          }
        ],
        "combinator": "and"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000603",
    "name": "Keep Only Stale Ones",
    "type": "n8n-nodes-base.filter",
    "typeVersion": 2.3,
    "position": [
      220,
      0
    ]
  },
  {
    "parameters": {
      "batchSize": 1,
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000604",
    "name": "One Issue At A Time",
    "type": "n8n-nodes-base.splitInBatches",
    "typeVersion": 3,
    "position": [
      440,
      0
    ]
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000605",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      700,
      240
    ]
  },
  {
    "parameters": {
      "promptType": "define",
      "text": "=Write a two sentence, friendly nudge asking for an update on this Linear issue. Mention the title and how long it has been quiet.\n\nTitle: {{ $json.title }}\nLast updated: {{ $json.updatedAt }}",
      "messages": {}
    },
    "id": "a1000000-0000-4000-8000-000000000606",
    "name": "Draft The Nudge",
    "type": "@n8n/n8n-nodes-langchain.chainLlm",
    "typeVersion": 1.9,
    "position": [
      660,
      100
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "comment",
      "operation": "addComment",
      "issueId": "={{ $(''One Issue At A Time'').item.json.id }}",
      "comment": "={{ $json.text }}",
      "additionalFields": {}
    },
    "id": "a1000000-0000-4000-8000-000000000607",
    "name": "Add Nudge Comment",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      900,
      100
    ]
  },
  {
    "parameters": {
      "content": "## One at a time\nThe loop runs with a batch size of one because every pass writes a comment.\nThe comment node reads the issue id from the loop, not from the model output.",
      "width": 300,
      "height": 160
    },
    "id": "a1000000-0000-4000-8000-000000000608",
    "name": "Sticky Note",
    "type": "n8n-nodes-base.stickyNote",
    "typeVersion": 1,
    "position": [
      400,
      -240
    ]
  }
]',
  '{
  "Every Morning At 7": {
    "main": [
      [
        {
          "node": "Get Open Issues",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Get Open Issues": {
    "main": [
      [
        {
          "node": "Keep Only Stale Ones",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Keep Only Stale Ones": {
    "main": [
      [
        {
          "node": "One Issue At A Time",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "One Issue At A Time": {
    "main": [
      [],
      [
        {
          "node": "Draft The Nudge",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Draft The Nudge": {
    "main": [
      [
        {
          "node": "Add Nudge Comment",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Add Nudge Comment": {
    "main": [
      [
        {
          "node": "One Issue At A Time",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Draft The Nudge",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000006',
  1,
  0,
  '[]',
  DATETIME('now', '-4 days'),
  DATETIME('now', '-2 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000006', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-4 days'), DATETIME('now', '-2 days'));

-- 7. [seed-al] Meeting notes to Linear tasks
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000007',
  '[seed-al] Meeting notes to Linear tasks',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {},
    "id": "a1000000-0000-4000-8000-000000000701",
    "name": "Run Manually",
    "type": "n8n-nodes-base.manualTrigger",
    "typeVersion": 1,
    "position": [
      -220,
      0
    ]
  },
  {
    "parameters": {
      "mode": "manual",
      "assignments": {
        "assignments": [
          {
            "id": "a7s1",
            "name": "notes",
            "type": "string",
            "value": "Replace this with the meeting notes to turn into tasks."
          }
        ]
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000702",
    "name": "Paste The Notes",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.5,
    "position": [
      0,
      0
    ]
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000703",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      280,
      220
    ]
  },
  {
    "parameters": {
      "text": "={{ $json.notes }}",
      "schemaType": "fromJson",
      "jsonSchemaExample": "{\n  \"tasks\": [\n    {\n      \"title\": \"Ship the retry fix\",\n      \"owner\": \"Priya\",\n      \"detail\": \"Agreed to land before the next cycle\"\n    }\n  ]\n}",
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000704",
    "name": "Extract The Tasks",
    "type": "@n8n/n8n-nodes-langchain.informationExtractor",
    "typeVersion": 1.2,
    "position": [
      220,
      0
    ]
  },
  {
    "parameters": {
      "batchSize": 1,
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000705",
    "name": "One Task At A Time",
    "type": "n8n-nodes-base.splitInBatches",
    "typeVersion": 3,
    "position": [
      440,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "={{ $json.title }}",
      "additionalFields": {
        "description": "=Owner discussed in the meeting: {{ $json.owner }}\n\n{{ $json.detail }}",
        "priorityId": 3
      }
    },
    "id": "a1000000-0000-4000-8000-000000000706",
    "name": "Create Task Issue",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      680,
      100
    ]
  }
]',
  '{
  "Run Manually": {
    "main": [
      [
        {
          "node": "Paste The Notes",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Paste The Notes": {
    "main": [
      [
        {
          "node": "Extract The Tasks",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Extract The Tasks": {
    "main": [
      [
        {
          "node": "One Task At A Time",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "One Task At A Time": {
    "main": [
      [],
      [
        {
          "node": "Create Task Issue",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Create Task Issue": {
    "main": [
      [
        {
          "node": "One Task At A Time",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Extract The Tasks",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000007',
  1,
  0,
  '[]',
  DATETIME('now', '-2 days'),
  DATETIME('now', '-2 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000007', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-2 days'), DATETIME('now', '-2 days'));

-- 8. [seed-al] Failed run to Linear bug
INSERT INTO "workflow_entity"
  ("id", "name", "active", "isArchived", "nodes", "connections", "settings",
   "versionId", "versionCounter", "triggerCount", "nodeGroups", "createdAt", "updatedAt")
VALUES (
  'seedAlWf00000008',
  '[seed-al] Failed run to Linear bug',
  FALSE,
  FALSE,
  '[
  {
    "parameters": {},
    "id": "a1000000-0000-4000-8000-000000000801",
    "name": "On Workflow Failure",
    "type": "n8n-nodes-base.errorTrigger",
    "typeVersion": 1,
    "position": [
      -220,
      0
    ]
  },
  {
    "parameters": {
      "mode": "manual",
      "assignments": {
        "assignments": [
          {
            "id": "a8s1",
            "name": "workflowName",
            "type": "string",
            "value": "={{ $json.workflow.name }}"
          },
          {
            "id": "a8s2",
            "name": "failedNode",
            "type": "string",
            "value": "={{ $json.execution.lastNodeExecuted }}"
          },
          {
            "id": "a8s3",
            "name": "message",
            "type": "string",
            "value": "={{ $json.execution.error.message }}"
          }
        ]
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000802",
    "name": "Read The Failure",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.5,
    "position": [
      0,
      0
    ]
  },
  {
    "parameters": {
      "model": {
        "__rl": true,
        "mode": "list",
        "value": "claude-sonnet-4-6",
        "cachedResultName": "Claude Sonnet 4.6"
      },
      "options": {}
    },
    "id": "a1000000-0000-4000-8000-000000000803",
    "name": "Anthropic Chat Model",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.5,
    "position": [
      280,
      220
    ]
  },
  {
    "parameters": {
      "promptType": "define",
      "text": "=Turn this n8n execution failure into a bug report body. Say what broke, where, and what to check first. Keep it under 120 words.\n\nWorkflow: {{ $json.workflowName }}\nNode: {{ $json.failedNode }}\nError: {{ $json.message }}",
      "messages": {}
    },
    "id": "a1000000-0000-4000-8000-000000000804",
    "name": "Describe The Failure",
    "type": "@n8n/n8n-nodes-langchain.chainLlm",
    "typeVersion": 1.9,
    "position": [
      220,
      0
    ]
  },
  {
    "parameters": {
      "authentication": "apiToken",
      "resource": "issue",
      "operation": "create",
      "teamId": "",
      "title": "=Failure in {{ $(''Read The Failure'').item.json.workflowName }}",
      "additionalFields": {
        "description": "={{ $json.text }}",
        "priorityId": 2
      }
    },
    "id": "a1000000-0000-4000-8000-000000000805",
    "name": "Create Failure Bug",
    "type": "n8n-nodes-base.linear",
    "typeVersion": 1.1,
    "position": [
      460,
      0
    ]
  },
  {
    "parameters": {
      "content": "## Attach me as an error workflow\nn8n has no instance wide error workflow. Set this per workflow under workflow settings.",
      "width": 300,
      "height": 160
    },
    "id": "a1000000-0000-4000-8000-000000000806",
    "name": "Sticky Note",
    "type": "n8n-nodes-base.stickyNote",
    "typeVersion": 1,
    "position": [
      -260,
      -220
    ]
  }
]',
  '{
  "On Workflow Failure": {
    "main": [
      [
        {
          "node": "Read The Failure",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Read The Failure": {
    "main": [
      [
        {
          "node": "Describe The Failure",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Describe The Failure": {
    "main": [
      [
        {
          "node": "Create Failure Bug",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Anthropic Chat Model": {
    "ai_languageModel": [
      [
        {
          "node": "Describe The Failure",
          "type": "ai_languageModel",
          "index": 0
        }
      ]
    ]
  }
}',
  '{"executionOrder": "v1"}',
  'a1000000-0000-4000-8000-000000000008',
  1,
  0,
  '[]',
  DATETIME('now', '-1 days'),
  DATETIME('now', '-1 days')
);
INSERT INTO "shared_workflow" ("workflowId", "projectId", "role", "createdAt", "updatedAt")
VALUES ('seedAlWf00000008', (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow:owner', DATETIME('now', '-1 days'), DATETIME('now', '-1 days'));

-- -----------------------------------------------------------------------------
-- OPTIONAL: attach your credentials to every seeded node
-- -----------------------------------------------------------------------------
--
-- Create one Anthropic credential and one Linear credential in the UI first,
-- then run this section. It rewrites the seeded nodes in place, adding a
-- `credentials` block that points at whichever credential of each type it finds.
-- The EXISTS guard matters: without it, a missing credential would make the
-- sub-select NULL and REPLACE would blank the whole `nodes` column.
--
-- Skip this section entirely if you would rather pick credentials in the UI.

UPDATE "workflow_entity"
SET "nodes" = REPLACE(
  "nodes",
  '"type": "@n8n/n8n-nodes-langchain.lmChatAnthropic"',
  '"credentials": {"anthropicApi": {"id": "' ||
    (SELECT "id" FROM "credentials_entity" WHERE "type" = 'anthropicApi' ORDER BY "createdAt" LIMIT 1) ||
    '", "name": "' ||
    (SELECT "name" FROM "credentials_entity" WHERE "type" = 'anthropicApi' ORDER BY "createdAt" LIMIT 1) ||
    '"}}, "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic"'
)
WHERE "id" LIKE 'seedAlWf%'
  AND EXISTS (SELECT 1 FROM "credentials_entity" WHERE "type" = 'anthropicApi');

UPDATE "workflow_entity"
SET "nodes" = REPLACE(
  "nodes",
  '"type": "n8n-nodes-base.linear"',
  '"credentials": {"linearApi": {"id": "' ||
    (SELECT "id" FROM "credentials_entity" WHERE "type" = 'linearApi' ORDER BY "createdAt" LIMIT 1) ||
    '", "name": "' ||
    (SELECT "name" FROM "credentials_entity" WHERE "type" = 'linearApi' ORDER BY "createdAt" LIMIT 1) ||
    '"}}, "type": "n8n-nodes-base.linear"'
)
WHERE "id" LIKE 'seedAlWf%'
  AND EXISTS (SELECT 1 FROM "credentials_entity" WHERE "type" = 'linearApi');

-- The agent's Linear tool is a separate node type, so it needs its own pass.
UPDATE "workflow_entity"
SET "nodes" = REPLACE(
  "nodes",
  '"type": "n8n-nodes-base.linearTool"',
  '"credentials": {"linearApi": {"id": "' ||
    (SELECT "id" FROM "credentials_entity" WHERE "type" = 'linearApi' ORDER BY "createdAt" LIMIT 1) ||
    '", "name": "' ||
    (SELECT "name" FROM "credentials_entity" WHERE "type" = 'linearApi' ORDER BY "createdAt" LIMIT 1) ||
    '"}}, "type": "n8n-nodes-base.linearTool"'
)
WHERE "id" LIKE 'seedAlWf%'
  AND EXISTS (SELECT 1 FROM "credentials_entity" WHERE "type" = 'linearApi');


-- =============================================================================
-- OPTIONAL: activity log
-- =============================================================================
--
-- `activity_event` is the append-only feed the instance agent is handed at the
-- start of a turn. It only exists on builds that carry the activity-log
-- migrations, so this section is last and self-contained.
--
--   * If the table exists, the four statements below give the feed a fortnight
--     of plausible history for the workflows above.
--   * If it does not, all four fail with "no such table: activity_event" and
--     nothing else is affected -- everything above is already committed. The
--     sqlite3 CLI prints one error per statement, keeps going, and exits 1;
--     psql behaves the same unless ON_ERROR_STOP is set.
--
-- To skip it cleanly instead:
--   sed '/^-- >>> ACTIVITY LOG/,$d' seed-anthropic-linear-workflows.sql | sqlite3 ~/.n8n/database.sqlite
--
-- Entries carry a project. The reader drops entries without one, since there is
-- no way to prove an unscoped entry is inside the caller's project scope. Runs
-- fired by a schedule carry no user, because nobody pressed anything.
--
-- The history spans a fortnight, but the reader only shows the last seven days,
-- so about two thirds of these entries are there to be found by
-- `activity(action="list")` rather than to appear in the window.
--
-- -- >>> ACTIVITY LOG

-- Broader than the workflow prefix on purpose: the credential entries below point at
-- seedAlCred ids, and matching only seedAlWf would duplicate them on every re-run.
DELETE FROM "activity_event" WHERE "resourceId" LIKE 'seedAl%';

-- Workflow lifecycle: each workflow created, later saved, two of them published.
INSERT INTO "activity_event"
  ("category", "action", "userId", "projectId", "resourceType", "resourceId", "resourceName", "data", "createdAt")
VALUES
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000001', '[seed-al] Bug report intake to Linear', '{"nodeCount": 8}', DATETIME('now', '-13 days')),
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000002', '[seed-al] Daily Linear standup digest', '{"nodeCount": 6}', DATETIME('now', '-12 days')),
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000003', '[seed-al] Support assistant with Linear escalation', '{"nodeCount": 6}', DATETIME('now', '-9 days')),
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000004', '[seed-al] Route feature requests by theme', '{"nodeCount": 6}', DATETIME('now', '-8 days')),
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000005', '[seed-al] Weekly Linear cycle report', '{"nodeCount": 8}', DATETIME('now', '-6 days')),
  ('workflow', 'saved', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000001', '[seed-al] Bug report intake to Linear', '{"nodeCount": 8, "nodeDelta": 2}', DATETIME('now', '-11 days')),
  ('workflow', 'published', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000002', '[seed-al] Daily Linear standup digest', NULL, DATETIME('now', '-11 days')),
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000006', '[seed-al] Nudge stale Linear issues', '{"nodeCount": 8}', DATETIME('now', '-4 days')),
  ('workflow', 'published', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000006', '[seed-al] Nudge stale Linear issues', NULL, DATETIME('now', '-3 days')),
  ('workflow', 'saved', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000005', '[seed-al] Weekly Linear cycle report', '{"nodeCount": 8, "nodeDelta": 1}', DATETIME('now', '-2 days')),
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000007', '[seed-al] Meeting notes to Linear tasks', '{"nodeCount": 6}', DATETIME('now', '-2 days')),
  ('workflow', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000008', '[seed-al] Failed run to Linear bug', '{"nodeCount": 6}', DATETIME('now', '-1 days')),
  ('workflow', 'saved', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000003', '[seed-al] Support assistant with Linear escalation', '{"nodeCount": 6, "nodeDelta": 1}', DATETIME('now', '-90 minutes')),
  ('workflow', 'saved', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000007', '[seed-al] Meeting notes to Linear tasks', '{"nodeCount": 6, "nodeDelta": 3}', DATETIME('now', '-25 minutes'));

-- Runs. The standup digest is the busy one; the nudger is the one that broke.
-- No user id on a scheduled run -- nobody pressed anything.
INSERT INTO "activity_event"
  ("category", "action", "userId", "projectId", "resourceType", "resourceId", "resourceName", "data", "createdAt")
VALUES
  ('execution', 'succeeded', NULL, (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000002', '[seed-al] Daily Linear standup digest', '{"executionId": "seedAlEx000001", "status": "success", "mode": "trigger"}', DATETIME('now', '-3 days')),
  ('execution', 'succeeded', NULL, (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000002', '[seed-al] Daily Linear standup digest', '{"executionId": "seedAlEx000002", "status": "success", "mode": "trigger"}', DATETIME('now', '-2 days')),
  ('execution', 'succeeded', NULL, (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000002', '[seed-al] Daily Linear standup digest', '{"executionId": "seedAlEx000003", "status": "success", "mode": "trigger"}', DATETIME('now', '-1 days')),
  ('execution', 'succeeded', NULL, (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000002', '[seed-al] Daily Linear standup digest', '{"executionId": "seedAlEx000004", "status": "success", "mode": "trigger"}', DATETIME('now', '-180 minutes')),
  ('execution', 'failed', NULL, (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000006', '[seed-al] Nudge stale Linear issues', '{"executionId": "seedAlEx000005", "status": "error", "mode": "trigger", "failedNode": "Add Nudge Comment"}', DATETIME('now', '-140 minutes')),
  ('execution', 'failed', NULL, (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000006', '[seed-al] Nudge stale Linear issues', '{"executionId": "seedAlEx000006", "status": "error", "mode": "trigger", "failedNode": "Add Nudge Comment"}', DATETIME('now', '-80 minutes')),
  ('execution', 'succeeded', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000007', '[seed-al] Meeting notes to Linear tasks', '{"executionId": "seedAlEx000007", "status": "success", "mode": "manual"}', DATETIME('now', '-20 minutes')),
  ('eval', 'succeeded', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'workflow', 'seedAlWf00000004', '[seed-al] Route feature requests by theme', '{"executionId": "seedAlEx000008", "status": "success", "mode": "evaluation"}', DATETIME('now', '-8 minutes'));

-- The two credentials this estate needs, recorded as if they were set up first.
INSERT INTO "activity_event"
  ("category", "action", "userId", "projectId", "resourceType", "resourceId", "resourceName", "data", "createdAt")
VALUES
  ('credential', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'credential', 'seedAlCred00001', 'anthropicApi', NULL, DATETIME('now', '-13 days')),
  ('credential', 'created', (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "project" WHERE "type" = 'personal' ORDER BY "createdAt" ASC LIMIT 1), 'credential', 'seedAlCred00002', 'linearApi', NULL, DATETIME('now', '-13 days'));
