/**
 * Workflow definitions for the seeded estate.
 *
 * Every workflow uses the Anthropic chat model and touches Linear. Where n8n offers more than
 * one node for a job, exactly one was chosen and is used everywhere -- see CHOICES in
 * seed-anthropic-linear.mjs. Adding a workflow means following that table, not picking again.
 *
 * `createdDaysAgo` / `updatedDaysAgo` spread the estate over a fortnight, which is what makes
 * the activity feed and the runs list worth looking at.
 */
export const WORKFLOWS = [
	{
		id: 'seedAlWf00000001',
		name: '[seed-al] Bug report intake to Linear',
		versionId: 'a1000000-0000-4000-8000-000000000001',
		createdDaysAgo: 13,
		updatedDaysAgo: 11,
		nodes: [
			{
				parameters: {
					httpMethod: 'POST',
					path: 'seed-al-bug-report',
					responseMode: 'responseNode',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000101',
				name: 'Bug Report Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2.1,
				position: [-220, 0],
				webhookId: 'a1000000-0000-4000-8000-0000000001aa',
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000102',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [60, 200],
			},
			{
				parameters: {
					text: '={{ $json.body.message }}',
					schemaType: 'fromAttributes',
					attributes: {
						attributes: [
							{
								name: 'summary',
								type: 'string',
								description: 'One sentence describing the problem',
								required: true,
							},
							{
								name: 'component',
								type: 'string',
								description: 'Which part of the product is affected',
								required: true,
							},
							{
								name: 'severity',
								type: 'string',
								description: 'One of high, medium or low',
								required: true,
							},
						],
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000103',
				name: 'Extract Report Fields',
				type: '@n8n/n8n-nodes-langchain.informationExtractor',
				typeVersion: 1.2,
				position: [0, 0],
			},
			{
				parameters: {
					conditions: {
						options: {
							caseSensitive: false,
							leftValue: '',
							typeValidation: 'strict',
							version: 2,
						},
						conditions: [
							{
								id: 'a1c1',
								operator: {
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.output.severity }}',
								rightValue: 'high',
							},
						],
						combinator: 'and',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000104',
				name: 'Is It Urgent',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.3,
				position: [220, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $json.output.summary }}',
					additionalFields: {
						description:
							'=Component: {{ $json.output.component }}\nReported through the bug intake webhook.',
						priorityId: 1,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000105',
				name: 'Create Urgent Bug',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [440, -100],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $json.output.summary }}',
					additionalFields: {
						description:
							'=Component: {{ $json.output.component }}\nReported through the bug intake webhook.',
						priorityId: 3,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000106',
				name: 'Create Backlog Bug',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [440, 120],
			},
			{
				parameters: {
					respondWith: 'json',
					responseBody: '={{ { "issue": $json.identifier } }}',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000107',
				name: 'Acknowledge Report',
				type: 'n8n-nodes-base.respondToWebhook',
				typeVersion: 1.5,
				position: [680, 0],
			},
			{
				parameters: {
					content:
						'## Bug intake\nA POST body with a free text message becomes a triaged Linear issue.\nUrgent reports get priority 1, everything else lands in the backlog.',
					width: 300,
					height: 160,
				},
				id: 'a1000000-0000-4000-8000-000000000108',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [-260, -220],
			},
		],
		connections: {
			'Bug Report Webhook': {
				main: [
					[
						{
							node: 'Extract Report Fields',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Extract Report Fields': {
				main: [
					[
						{
							node: 'Is It Urgent',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Is It Urgent': {
				main: [
					[
						{
							node: 'Create Urgent Bug',
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: 'Create Backlog Bug',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Create Urgent Bug': {
				main: [
					[
						{
							node: 'Acknowledge Report',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Create Backlog Bug': {
				main: [
					[
						{
							node: 'Acknowledge Report',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Extract Report Fields',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000002',
		name: '[seed-al] Daily Linear standup digest',
		versionId: 'a1000000-0000-4000-8000-000000000002',
		createdDaysAgo: 12,
		updatedDaysAgo: 6,
		nodes: [
			{
				parameters: {
					rule: {
						interval: [
							{
								field: 'cronExpression',
								expression: '0 9 * * 1-5',
							},
						],
					},
				},
				id: 'a1000000-0000-4000-8000-000000000201',
				name: 'Every Weekday At 9',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.4,
				position: [-220, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'getAll',
					returnAll: false,
					limit: 50,
				},
				id: 'a1000000-0000-4000-8000-000000000202',
				name: 'Get Recent Issues',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [0, 0],
			},
			{
				parameters: {
					aggregate: 'aggregateAllItemData',
					destinationFieldName: 'issues',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000203',
				name: 'Collect Issues',
				type: 'n8n-nodes-base.aggregate',
				typeVersion: 1,
				position: [220, 0],
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000204',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [480, 200],
			},
			{
				parameters: {
					promptType: 'define',
					text: '=Write a short standup digest from this Linear issue list. Group by state and keep it under 200 words.\n\n{{ JSON.stringify($json.issues) }}',
					messages: {},
				},
				id: 'a1000000-0000-4000-8000-000000000205',
				name: 'Write The Digest',
				type: '@n8n/n8n-nodes-langchain.chainLlm',
				typeVersion: 1.9,
				position: [440, 0],
				executeOnce: true,
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'comment',
					operation: 'addComment',
					issueId: '',
					comment: '={{ $json.text }}',
					additionalFields: {},
				},
				id: 'a1000000-0000-4000-8000-000000000206',
				name: 'Post Digest Comment',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [680, 0],
				executeOnce: true,
			},
		],
		connections: {
			'Every Weekday At 9': {
				main: [
					[
						{
							node: 'Get Recent Issues',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Recent Issues': {
				main: [
					[
						{
							node: 'Collect Issues',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Collect Issues': {
				main: [
					[
						{
							node: 'Write The Digest',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Write The Digest': {
				main: [
					[
						{
							node: 'Post Digest Comment',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Write The Digest',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000003',
		name: '[seed-al] Support assistant with Linear escalation',
		versionId: 'a1000000-0000-4000-8000-000000000003',
		createdDaysAgo: 9,
		updatedDaysAgo: 1,
		nodes: [
			{
				parameters: {
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000301',
				name: 'When Chat Message Received',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.4,
				position: [-220, 0],
				webhookId: 'a1000000-0000-4000-8000-0000000003aa',
			},
			{
				parameters: {
					promptType: 'auto',
					options: {
						systemMessage:
							'You are a support assistant. Answer from what the user tells you. When something is a genuine defect or needs engineering work, escalate it by creating a Linear issue with a clear title and a short description. Never escalate a question you can answer.',
					},
				},
				id: 'a1000000-0000-4000-8000-000000000302',
				name: 'Support Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1.3,
				position: [20, 0],
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000303',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [-80, 220],
			},
			{
				parameters: {},
				id: 'a1000000-0000-4000-8000-000000000304',
				name: 'Simple Memory',
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				typeVersion: 1.4,
				position: [100, 220],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $fromAI("title", "A short issue title", "string") }}',
					additionalFields: {
						description:
							'={{ $fromAI("description", "What the user reported and why it needs engineering", "string") }}',
					},
					descriptionType: 'manual',
					toolDescription: 'Create a Linear issue when something needs engineering work',
				},
				id: 'a1000000-0000-4000-8000-000000000305',
				name: 'create_issue',
				type: 'n8n-nodes-base.linearTool',
				typeVersion: 1.1,
				position: [280, 220],
			},
			{
				parameters: {
					content:
						'## Support assistant\nAnswers from the conversation and escalates real defects into Linear.\nMemory keeps the last few turns so follow ups make sense.',
					width: 300,
					height: 160,
				},
				id: 'a1000000-0000-4000-8000-000000000306',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [-260, -240],
			},
		],
		connections: {
			'When Chat Message Received': {
				main: [
					[
						{
							node: 'Support Agent',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Support Agent',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
			'Simple Memory': {
				ai_memory: [
					[
						{
							node: 'Support Agent',
							type: 'ai_memory',
							index: 0,
						},
					],
				],
			},
			create_issue: {
				ai_tool: [
					[
						{
							node: 'Support Agent',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000004',
		name: '[seed-al] Route feature requests by theme',
		versionId: 'a1000000-0000-4000-8000-000000000004',
		createdDaysAgo: 8,
		updatedDaysAgo: 7,
		nodes: [
			{
				parameters: {
					httpMethod: 'POST',
					path: 'seed-al-feature-request',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000401',
				name: 'Feature Request Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2.1,
				position: [-220, 0],
				webhookId: 'a1000000-0000-4000-8000-0000000004aa',
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000402',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [60, 220],
			},
			{
				parameters: {
					inputText: '={{ $json.body.request }}',
					categories: {
						categories: [
							{
								category: 'integrations',
								description: 'Asks for a new connector or a change to an existing one',
							},
							{
								category: 'reporting',
								description: 'Asks for dashboards, exports or analytics',
							},
							{
								category: 'platform',
								description: 'Asks for performance, reliability or access control work',
							},
						],
					},
					options: {
						fallback: 'other',
					},
				},
				id: 'a1000000-0000-4000-8000-000000000403',
				name: 'Classify Request',
				type: '@n8n/n8n-nodes-langchain.textClassifier',
				typeVersion: 1.1,
				position: [0, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $json.body.request.slice(0, 80) }}',
					additionalFields: {
						description: '=Theme: integrations\n\n{{ $json.body.request }}',
						priorityId: 3,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000404',
				name: 'File Integrations Request',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [240, -160],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $json.body.request.slice(0, 80) }}',
					additionalFields: {
						description: '=Theme: reporting\n\n{{ $json.body.request }}',
						priorityId: 3,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000405',
				name: 'File Reporting Request',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [240, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $json.body.request.slice(0, 80) }}',
					additionalFields: {
						description: '=Theme: platform\n\n{{ $json.body.request }}',
						priorityId: 3,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000406',
				name: 'File Platform Request',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [240, 160],
			},
		],
		connections: {
			'Feature Request Webhook': {
				main: [
					[
						{
							node: 'Classify Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Classify Request': {
				main: [
					[
						{
							node: 'File Integrations Request',
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: 'File Reporting Request',
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: 'File Platform Request',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Classify Request',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000005',
		name: '[seed-al] Weekly Linear cycle report',
		versionId: 'a1000000-0000-4000-8000-000000000005',
		createdDaysAgo: 6,
		updatedDaysAgo: 5,
		nodes: [
			{
				parameters: {
					rule: {
						interval: [
							{
								field: 'cronExpression',
								expression: '0 8 * * 1',
							},
						],
					},
				},
				id: 'a1000000-0000-4000-8000-000000000501',
				name: 'Every Monday At 8',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.4,
				position: [-220, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'getAll',
					returnAll: false,
					limit: 100,
				},
				id: 'a1000000-0000-4000-8000-000000000502',
				name: 'Get Cycle Issues',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [0, 0],
			},
			{
				parameters: {
					aggregate: 'aggregateAllItemData',
					destinationFieldName: 'issues',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000503',
				name: 'Collect Issues',
				type: 'n8n-nodes-base.aggregate',
				typeVersion: 1,
				position: [220, 0],
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000504',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [480, 220],
			},
			{
				parameters: {
					promptType: 'define',
					text: '=Write a weekly engineering report from this Linear issue list. Cover what shipped, what slipped and what is at risk. Keep it under 300 words.\n\n{{ JSON.stringify($json.issues) }}',
					messages: {},
				},
				id: 'a1000000-0000-4000-8000-000000000505',
				name: 'Write The Report',
				type: '@n8n/n8n-nodes-langchain.chainLlm',
				typeVersion: 1.9,
				position: [440, 0],
				executeOnce: true,
			},
			{
				parameters: {
					mode: 'manual',
					assignments: {
						assignments: [
							{
								id: 'a5s1',
								name: 'title',
								type: 'string',
								value: 'Weekly engineering report',
							},
							{
								id: 'a5s2',
								name: 'body',
								type: 'string',
								value: '={{ $json.text }}',
							},
							{
								id: 'a5s3',
								name: 'generatedAt',
								type: 'string',
								value: '={{ $now.toISO() }}',
							},
						],
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000506',
				name: 'Shape The Payload',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.5,
				position: [680, 0],
			},
			{
				parameters: {
					method: 'POST',
					url: 'https://example.invalid/reports',
					sendBody: true,
					specifyBody: 'json',
					jsonBody: '={{ JSON.stringify($json) }}',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000507',
				name: 'Post To Report Sink',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.5,
				position: [900, 0],
			},
			{
				parameters: {
					content:
						'## Replace the sink URL\nThe report is posted to an unroutable placeholder so a fresh seed cannot call anything real.\nSwap in your own endpoint before running this.',
					width: 300,
					height: 160,
				},
				id: 'a1000000-0000-4000-8000-000000000508',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [860, -220],
			},
		],
		connections: {
			'Every Monday At 8': {
				main: [
					[
						{
							node: 'Get Cycle Issues',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Cycle Issues': {
				main: [
					[
						{
							node: 'Collect Issues',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Collect Issues': {
				main: [
					[
						{
							node: 'Write The Report',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Write The Report': {
				main: [
					[
						{
							node: 'Shape The Payload',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Shape The Payload': {
				main: [
					[
						{
							node: 'Post To Report Sink',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Write The Report',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000006',
		name: '[seed-al] Nudge stale Linear issues',
		versionId: 'a1000000-0000-4000-8000-000000000006',
		createdDaysAgo: 4,
		updatedDaysAgo: 2,
		nodes: [
			{
				parameters: {
					rule: {
						interval: [
							{
								field: 'cronExpression',
								expression: '0 7 * * *',
							},
						],
					},
				},
				id: 'a1000000-0000-4000-8000-000000000601',
				name: 'Every Morning At 7',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.4,
				position: [-220, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'getAll',
					returnAll: false,
					limit: 100,
				},
				id: 'a1000000-0000-4000-8000-000000000602',
				name: 'Get Open Issues',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [0, 0],
			},
			{
				parameters: {
					conditions: {
						options: {
							caseSensitive: true,
							leftValue: '',
							typeValidation: 'loose',
							version: 2,
						},
						conditions: [
							{
								id: 'a6f1',
								operator: {
									type: 'dateTime',
									operation: 'before',
								},
								leftValue: '={{ $json.updatedAt }}',
								rightValue: '={{ $now.minus(14, "days").toISO() }}',
							},
						],
						combinator: 'and',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000603',
				name: 'Keep Only Stale Ones',
				type: 'n8n-nodes-base.filter',
				typeVersion: 2.3,
				position: [220, 0],
			},
			{
				parameters: {
					batchSize: 1,
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000604',
				name: 'One Issue At A Time',
				type: 'n8n-nodes-base.splitInBatches',
				typeVersion: 3,
				position: [440, 0],
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000605',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [700, 240],
			},
			{
				parameters: {
					promptType: 'define',
					text: '=Write a two sentence, friendly nudge asking for an update on this Linear issue. Mention the title and how long it has been quiet.\n\nTitle: {{ $json.title }}\nLast updated: {{ $json.updatedAt }}',
					messages: {},
				},
				id: 'a1000000-0000-4000-8000-000000000606',
				name: 'Draft The Nudge',
				type: '@n8n/n8n-nodes-langchain.chainLlm',
				typeVersion: 1.9,
				position: [660, 100],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'comment',
					operation: 'addComment',
					issueId: "={{ $('One Issue At A Time').item.json.id }}",
					comment: '={{ $json.text }}',
					additionalFields: {},
				},
				id: 'a1000000-0000-4000-8000-000000000607',
				name: 'Add Nudge Comment',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [900, 100],
			},
			{
				parameters: {
					content:
						'## One at a time\nThe loop runs with a batch size of one because every pass writes a comment.\nThe comment node reads the issue id from the loop, not from the model output.',
					width: 300,
					height: 160,
				},
				id: 'a1000000-0000-4000-8000-000000000608',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [400, -240],
			},
		],
		connections: {
			'Every Morning At 7': {
				main: [
					[
						{
							node: 'Get Open Issues',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Open Issues': {
				main: [
					[
						{
							node: 'Keep Only Stale Ones',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Keep Only Stale Ones': {
				main: [
					[
						{
							node: 'One Issue At A Time',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'One Issue At A Time': {
				main: [
					[],
					[
						{
							node: 'Draft The Nudge',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Draft The Nudge': {
				main: [
					[
						{
							node: 'Add Nudge Comment',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Add Nudge Comment': {
				main: [
					[
						{
							node: 'One Issue At A Time',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Draft The Nudge',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000007',
		name: '[seed-al] Meeting notes to Linear tasks',
		versionId: 'a1000000-0000-4000-8000-000000000007',
		createdDaysAgo: 2,
		updatedDaysAgo: 2,
		nodes: [
			{
				parameters: {},
				id: 'a1000000-0000-4000-8000-000000000701',
				name: 'Run Manually',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [-220, 0],
			},
			{
				parameters: {
					mode: 'manual',
					assignments: {
						assignments: [
							{
								id: 'a7s1',
								name: 'notes',
								type: 'string',
								value: 'Replace this with the meeting notes to turn into tasks.',
							},
						],
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000702',
				name: 'Paste The Notes',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.5,
				position: [0, 0],
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000703',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [280, 220],
			},
			{
				parameters: {
					text: '={{ $json.notes }}',
					schemaType: 'fromJson',
					jsonSchemaExample:
						'{\n  "tasks": [\n    {\n      "title": "Ship the retry fix",\n      "owner": "Priya",\n      "detail": "Agreed to land before the next cycle"\n    }\n  ]\n}',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000704',
				name: 'Extract The Tasks',
				type: '@n8n/n8n-nodes-langchain.informationExtractor',
				typeVersion: 1.2,
				position: [220, 0],
			},
			{
				parameters: {
					batchSize: 1,
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000705',
				name: 'One Task At A Time',
				type: 'n8n-nodes-base.splitInBatches',
				typeVersion: 3,
				position: [440, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $json.title }}',
					additionalFields: {
						description: '=Owner discussed in the meeting: {{ $json.owner }}\n\n{{ $json.detail }}',
						priorityId: 3,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000706',
				name: 'Create Task Issue',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [680, 100],
			},
		],
		connections: {
			'Run Manually': {
				main: [
					[
						{
							node: 'Paste The Notes',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Paste The Notes': {
				main: [
					[
						{
							node: 'Extract The Tasks',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Extract The Tasks': {
				main: [
					[
						{
							node: 'One Task At A Time',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'One Task At A Time': {
				main: [
					[],
					[
						{
							node: 'Create Task Issue',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Create Task Issue': {
				main: [
					[
						{
							node: 'One Task At A Time',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Extract The Tasks',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000008',
		name: '[seed-al] Failed run to Linear bug',
		versionId: 'a1000000-0000-4000-8000-000000000008',
		createdDaysAgo: 1,
		updatedDaysAgo: 1,
		nodes: [
			{
				parameters: {},
				id: 'a1000000-0000-4000-8000-000000000801',
				name: 'On Workflow Failure',
				type: 'n8n-nodes-base.errorTrigger',
				typeVersion: 1,
				position: [-220, 0],
			},
			{
				parameters: {
					mode: 'manual',
					assignments: {
						assignments: [
							{
								id: 'a8s1',
								name: 'workflowName',
								type: 'string',
								value: '={{ $json.workflow.name }}',
							},
							{
								id: 'a8s2',
								name: 'failedNode',
								type: 'string',
								value: '={{ $json.execution.lastNodeExecuted }}',
							},
							{
								id: 'a8s3',
								name: 'message',
								type: 'string',
								value: '={{ $json.execution.error.message }}',
							},
						],
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000802',
				name: 'Read The Failure',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.5,
				position: [0, 0],
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000803',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [280, 220],
			},
			{
				parameters: {
					promptType: 'define',
					text: '=Turn this n8n execution failure into a bug report body. Say what broke, where, and what to check first. Keep it under 120 words.\n\nWorkflow: {{ $json.workflowName }}\nNode: {{ $json.failedNode }}\nError: {{ $json.message }}',
					messages: {},
				},
				id: 'a1000000-0000-4000-8000-000000000804',
				name: 'Describe The Failure',
				type: '@n8n/n8n-nodes-langchain.chainLlm',
				typeVersion: 1.9,
				position: [220, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: "=Failure in {{ $('Read The Failure').item.json.workflowName }}",
					additionalFields: {
						description: '={{ $json.text }}',
						priorityId: 2,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000805',
				name: 'Create Failure Bug',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [460, 0],
			},
			{
				parameters: {
					content:
						'## Attach me as an error workflow\nn8n has no instance wide error workflow. Set this per workflow under workflow settings.',
					width: 300,
					height: 160,
				},
				id: 'a1000000-0000-4000-8000-000000000806',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [-260, -220],
			},
		],
		connections: {
			'On Workflow Failure': {
				main: [
					[
						{
							node: 'Read The Failure',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Read The Failure': {
				main: [
					[
						{
							node: 'Describe The Failure',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Describe The Failure': {
				main: [
					[
						{
							node: 'Create Failure Bug',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Describe The Failure',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000009',
		name: '[seed-al] Route bugs with the triage table',
		versionId: 'a1000000-0000-4000-8000-000000000009',
		createdDaysAgo: 5,
		updatedDaysAgo: 1,
		nodes: [
			{
				parameters: {
					httpMethod: 'POST',
					path: 'seed-al-triage',
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000901',
				name: 'Triage Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2.1,
				position: [-220, 0],
				webhookId: 'a1000000-0000-4000-8000-0000000009aa',
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000902',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [40, 220],
			},
			{
				parameters: {
					text: '={{ $json.body.message }}',
					schemaType: 'fromAttributes',
					attributes: {
						attributes: [
							{
								name: 'component',
								type: 'string',
								description: 'Which product area is affected, as a single lowercase word',
								required: true,
							},
							{
								name: 'summary',
								type: 'string',
								description: 'One sentence describing the problem',
								required: true,
							},
						],
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000903',
				name: 'Name The Component',
				type: '@n8n/n8n-nodes-langchain.informationExtractor',
				typeVersion: 1.2,
				position: [0, 0],
			},
			{
				parameters: {
					resource: 'row',
					operation: 'get',
					dataTableId: {
						__rl: true,
						mode: 'list',
						value: 'seedAlDt00000001',
						cachedResultName: 'seed_al_triage_routing',
					},
					filterType: 'anyFilter',
					filters: {
						conditions: [
							{
								keyName: 'component',
								condition: 'eq',
								keyValue: '={{ $json.output.component }}',
							},
						],
					},
					returnAll: false,
					limit: 1,
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000904',
				name: 'Look Up Routing Rule',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1.1,
				position: [240, 0],
			},
			{
				parameters: {
					conditions: {
						options: {
							caseSensitive: true,
							leftValue: '',
							typeValidation: 'loose',
							version: 2,
						},
						conditions: [
							{
								id: 'a9c1',
								operator: {
									type: 'string',
									operation: 'exists',
									singleValue: true,
								},
								leftValue: '={{ $json.linearTeamKey }}',
								rightValue: '',
							},
						],
						combinator: 'and',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000000905',
				name: 'Did We Find A Rule',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.3,
				position: [460, 0],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: "={{ $('Name The Component').item.json.output.summary }}",
					additionalFields: {
						description:
							'=Routed by the triage table.\nComponent: {{ $json.component }}\nOwner on rota: {{ $json.owner }}\nTeam key: {{ $json.linearTeamKey }}',
						priorityId: '={{ $json.priority }}',
					},
				},
				id: 'a1000000-0000-4000-8000-000000000906',
				name: 'Create Routed Issue',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [700, -110],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: "={{ $('Name The Component').item.json.output.summary }}",
					additionalFields: {
						description:
							'=No triage rule matched component "{{ $(\'Name The Component\').item.json.output.component }}". Add one to the routing table.',
						priorityId: 3,
					},
				},
				id: 'a1000000-0000-4000-8000-000000000907',
				name: 'Create Unrouted Issue',
				type: 'n8n-nodes-base.linear',
				typeVersion: 1.1,
				position: [700, 120],
			},
			{
				parameters: {
					content:
						'## The routing table decides\nComponent, Linear team key, priority and the owner on rota live in the seed_al_triage_routing data table.\nAdding a component is a row, not a workflow edit.',
					width: 340,
					height: 170,
				},
				id: 'a1000000-0000-4000-8000-000000000908',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [200, -260],
			},
		],
		connections: {
			'Triage Webhook': {
				main: [
					[
						{
							node: 'Name The Component',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Name The Component': {
				main: [
					[
						{
							node: 'Look Up Routing Rule',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Look Up Routing Rule': {
				main: [
					[
						{
							node: 'Did We Find A Rule',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Did We Find A Rule': {
				main: [
					[
						{
							node: 'Create Routed Issue',
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: 'Create Unrouted Issue',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Name The Component',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
		},
	},
	{
		id: 'seedAlWf00000010',
		name: '[seed-al] Tier-aware support assistant',
		versionId: 'a1000000-0000-4000-8000-000000000010',
		createdDaysAgo: 3,
		updatedDaysAgo: 1,
		nodes: [
			{
				parameters: {
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000001001',
				name: 'When Chat Message Received',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.4,
				position: [-220, 0],
				webhookId: 'a1000000-0000-4000-8000-0000000010aa',
			},
			{
				parameters: {
					promptType: 'auto',
					options: {
						systemMessage:
							'You are a support assistant. Before deciding how to handle a request, look up the customer tier for their email domain. Escalate to Linear only when the tier says to, or when the problem is a genuine defect. Say which tier you found and why it changed what you did.',
					},
				},
				id: 'a1000000-0000-4000-8000-000000001002',
				name: 'Tier Aware Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1.3,
				position: [40, 0],
			},
			{
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-6',
						cachedResultName: 'Claude Sonnet 4.6',
					},
					options: {},
				},
				id: 'a1000000-0000-4000-8000-000000001003',
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				typeVersion: 1.5,
				position: [-140, 240],
			},
			{
				parameters: {},
				id: 'a1000000-0000-4000-8000-000000001004',
				name: 'Simple Memory',
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				typeVersion: 1.4,
				position: [20, 240],
			},
			{
				parameters: {
					resource: 'row',
					operation: 'get',
					dataTableId: {
						__rl: true,
						mode: 'list',
						value: 'seedAlDt00000002',
						cachedResultName: 'seed_al_customer_tiers',
					},
					filterType: 'anyFilter',
					filters: {
						conditions: [
							{
								keyName: 'domain',
								condition: 'eq',
								keyValue:
									'={{ $fromAI("domain", "The email domain of the customer, e.g. acme.com", "string") }}',
							},
						],
					},
					returnAll: false,
					limit: 1,
					options: {},
					descriptionType: 'manual',
					toolDescription: 'Look up the support tier for a customer email domain',
				},
				id: 'a1000000-0000-4000-8000-000000001005',
				name: 'look_up_tier',
				type: 'n8n-nodes-base.dataTableTool',
				typeVersion: 1.1,
				position: [180, 240],
			},
			{
				parameters: {
					authentication: 'apiToken',
					resource: 'issue',
					operation: 'create',
					teamId: '',
					title: '={{ $fromAI("title", "A short issue title", "string") }}',
					additionalFields: {
						description:
							'={{ $fromAI("description", "What the customer reported, their tier, and why it needs engineering", "string") }}',
					},
					descriptionType: 'manual',
					toolDescription: 'Create a Linear issue when a request needs engineering work',
				},
				id: 'a1000000-0000-4000-8000-000000001006',
				name: 'create_issue',
				type: 'n8n-nodes-base.linearTool',
				typeVersion: 1.1,
				position: [380, 240],
			},
		],
		connections: {
			'When Chat Message Received': {
				main: [
					[
						{
							node: 'Tier Aware Agent',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Anthropic Chat Model': {
				ai_languageModel: [
					[
						{
							node: 'Tier Aware Agent',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
			'Simple Memory': {
				ai_memory: [
					[
						{
							node: 'Tier Aware Agent',
							type: 'ai_memory',
							index: 0,
						},
					],
				],
			},
			look_up_tier: {
				ai_tool: [
					[
						{
							node: 'Tier Aware Agent',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
			create_issue: {
				ai_tool: [
					[
						{
							node: 'Tier Aware Agent',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
		},
	},
];

/**
 * Data tables the workflows read. Rows live in a `data_table_user_<id>` table that n8n creates on
 * demand, so seeding one means issuing that CREATE TABLE too — see createRowTable in the runner.
 */
export const DATA_TABLES = [
	{
		id: 'seedAlDt00000001',
		name: 'seed_al_triage_routing',
		createdDaysAgo: 13,
		columns: [
			{ name: 'component', type: 'string' },
			{ name: 'linearTeamKey', type: 'string' },
			{ name: 'priority', type: 'number' },
			{ name: 'owner', type: 'string' },
		],
		rows: [
			{ component: 'billing', linearTeamKey: 'PAY', priority: 1, owner: 'Priya' },
			{ component: 'auth', linearTeamKey: 'PLAT', priority: 1, owner: 'Sam' },
			{ component: 'webhooks', linearTeamKey: 'PLAT', priority: 2, owner: 'Sam' },
			{ component: 'editor', linearTeamKey: 'APP', priority: 2, owner: 'Noor' },
			{ component: 'reporting', linearTeamKey: 'DATA', priority: 3, owner: 'Ollie' },
			{ component: 'docs', linearTeamKey: 'APP', priority: 4, owner: 'Noor' },
		],
	},
	{
		id: 'seedAlDt00000002',
		name: 'seed_al_customer_tiers',
		createdDaysAgo: 12,
		columns: [
			{ name: 'domain', type: 'string' },
			{ name: 'tier', type: 'string' },
			{ name: 'escalate', type: 'boolean' },
			{ name: 'renewalOn', type: 'date' },
		],
		rows: [
			{ domain: 'acme.example', tier: 'enterprise', escalate: true, renewalOn: '2026-11-01' },
			{ domain: 'globex.example', tier: 'enterprise', escalate: true, renewalOn: '2027-02-15' },
			{ domain: 'initech.example', tier: 'growth', escalate: true, renewalOn: '2026-09-30' },
			{ domain: 'hooli.example', tier: 'growth', escalate: false, renewalOn: '2027-01-12' },
			{ domain: 'umbrella.example', tier: 'starter', escalate: false, renewalOn: '2026-10-05' },
			{ domain: 'soylent.example', tier: 'starter', escalate: false, renewalOn: '2026-12-20' },
			{ domain: 'vehement.example', tier: 'trial', escalate: false, renewalOn: '2026-09-08' },
			{ domain: 'cyberdyne.example', tier: 'trial', escalate: false, renewalOn: '2026-09-19' },
		],
	},
];

/**
 * Runs to fabricate, newest last. `nodes` is the per-node output each run produced, in execution
 * order — the runner turns it into the `runData` an execution needs to open properly in the UI.
 *
 * `failAt` names the node that threw. Everything before it succeeded, that node errored, and
 * nothing after it ran, which is what a real failed run looks like.
 */
export const EXECUTIONS = [
	{
		workflowId: 'seedAlWf00000001',
		mode: 'webhook',
		minutesAgo: 60 * 24 * 10,
		nodes: [
			['Bug Report Webhook', [{ body: { message: 'Checkout throws a 500 on the billing step' } }]],
			[
				'Extract Report Fields',
				[
					{
						output: {
							summary: 'Checkout returns 500 at the billing step',
							component: 'billing',
							severity: 'high',
						},
					},
				],
			],
			[
				'Is It Urgent',
				[
					{
						output: {
							summary: 'Checkout returns 500 at the billing step',
							component: 'billing',
							severity: 'high',
						},
					},
				],
			],
			[
				'Create Urgent Bug',
				[
					{
						id: 'iss_9001',
						identifier: 'PAY-412',
						title: 'Checkout returns 500 at the billing step',
					},
				],
			],
			['Acknowledge Report', [{ issue: 'PAY-412' }]],
		],
	},
	{
		workflowId: 'seedAlWf00000002',
		mode: 'trigger',
		minutesAgo: 60 * 24 * 3,
		nodes: [
			['Every Weekday At 9', [{}]],
			[
				'Get Recent Issues',
				[
					{ id: 'iss_1', title: 'Retry webhook deliveries', state: { name: 'In Progress' } },
					{ id: 'iss_2', title: 'Audit log export', state: { name: 'Todo' } },
				],
			],
			[
				'Collect Issues',
				[{ issues: [{ title: 'Retry webhook deliveries' }, { title: 'Audit log export' }] }],
			],
			[
				'Write The Digest',
				[
					{
						text: 'In progress: retrying webhook deliveries. Queued: audit log export. Nothing blocked.',
					},
				],
			],
			['Post Digest Comment', [{ success: true }]],
		],
	},
	{
		workflowId: 'seedAlWf00000002',
		mode: 'trigger',
		minutesAgo: 60 * 24 * 2,
		nodes: [
			['Every Weekday At 9', [{}]],
			[
				'Get Recent Issues',
				[{ id: 'iss_2', title: 'Audit log export', state: { name: 'In Progress' } }],
			],
			['Collect Issues', [{ issues: [{ title: 'Audit log export' }] }]],
			[
				'Write The Digest',
				[{ text: 'Audit log export moved to in progress. Nothing else changed.' }],
			],
			['Post Digest Comment', [{ success: true }]],
		],
	},
	{
		workflowId: 'seedAlWf00000002',
		mode: 'trigger',
		minutesAgo: 60 * 24,
		nodes: [
			['Every Weekday At 9', [{}]],
			['Get Recent Issues', [{ id: 'iss_2', title: 'Audit log export', state: { name: 'Done' } }]],
			['Collect Issues', [{ issues: [{ title: 'Audit log export' }] }]],
			['Write The Digest', [{ text: 'Audit log export shipped. Queue is empty.' }]],
			['Post Digest Comment', [{ success: true }]],
		],
	},
	{
		workflowId: 'seedAlWf00000009',
		mode: 'webhook',
		minutesAgo: 60 * 20,
		nodes: [
			['Triage Webhook', [{ body: { message: 'OAuth callback loops forever on login' } }]],
			[
				'Name The Component',
				[{ output: { component: 'auth', summary: 'OAuth callback loops on login' } }],
			],
			[
				'Look Up Routing Rule',
				[{ id: 2, component: 'auth', linearTeamKey: 'PLAT', priority: 1, owner: 'Sam' }],
			],
			[
				'Did We Find A Rule',
				[{ id: 2, component: 'auth', linearTeamKey: 'PLAT', priority: 1, owner: 'Sam' }],
			],
			[
				'Create Routed Issue',
				[{ id: 'iss_9002', identifier: 'PLAT-88', title: 'OAuth callback loops on login' }],
			],
		],
	},
	{
		workflowId: 'seedAlWf00000009',
		mode: 'webhook',
		minutesAgo: 60 * 6,
		nodes: [
			['Triage Webhook', [{ body: { message: 'The mobile app crashes when opening settings' } }]],
			[
				'Name The Component',
				[{ output: { component: 'mobile', summary: 'Mobile app crashes opening settings' } }],
			],
			['Look Up Routing Rule', [{}]],
			['Did We Find A Rule', [{}]],
			[
				'Create Unrouted Issue',
				[{ id: 'iss_9003', identifier: 'APP-201', title: 'Mobile app crashes opening settings' }],
			],
		],
	},
	{
		workflowId: 'seedAlWf00000007',
		mode: 'manual',
		minutesAgo: 20,
		nodes: [
			['Run Manually', [{}]],
			[
				'Paste The Notes',
				[
					{
						notes:
							'Priya to land the retry fix before the cycle closes. Sam to write up the webhook backoff decision.',
					},
				],
			],
			[
				'Extract The Tasks',
				[
					{
						output: {
							tasks: [
								{ title: 'Land the retry fix', owner: 'Priya', detail: 'Before the cycle closes' },
								{
									title: 'Write up the webhook backoff decision',
									owner: 'Sam',
									detail: 'Short design note',
								},
							],
						},
					},
				],
			],
			[
				'One Task At A Time',
				[{ title: 'Land the retry fix', owner: 'Priya', detail: 'Before the cycle closes' }],
			],
			[
				'Create Task Issue',
				[{ id: 'iss_9004', identifier: 'PAY-418', title: 'Land the retry fix' }],
			],
		],
	},
	{
		workflowId: 'seedAlWf00000006',
		mode: 'trigger',
		minutesAgo: 140,
		failAt: 'Add Nudge Comment',
		error: 'Linear API rejected the request: issueId must not be empty',
		nodes: [
			['Every Morning At 7', [{}]],
			[
				'Get Open Issues',
				[{ id: 'iss_5', title: 'Stale spike on caching', updatedAt: '2026-08-05T09:00:00.000Z' }],
			],
			[
				'Keep Only Stale Ones',
				[{ id: 'iss_5', title: 'Stale spike on caching', updatedAt: '2026-08-05T09:00:00.000Z' }],
			],
			[
				'One Issue At A Time',
				[{ id: 'iss_5', title: 'Stale spike on caching', updatedAt: '2026-08-05T09:00:00.000Z' }],
			],
			[
				'Draft The Nudge',
				[{ text: 'Any movement on the caching spike? It has been quiet for three weeks.' }],
			],
			['Add Nudge Comment', []],
		],
	},
	{
		workflowId: 'seedAlWf00000006',
		mode: 'trigger',
		minutesAgo: 80,
		failAt: 'Add Nudge Comment',
		error: 'Linear API rejected the request: issueId must not be empty',
		nodes: [
			['Every Morning At 7', [{}]],
			[
				'Get Open Issues',
				[{ id: 'iss_5', title: 'Stale spike on caching', updatedAt: '2026-08-05T09:00:00.000Z' }],
			],
			[
				'Keep Only Stale Ones',
				[{ id: 'iss_5', title: 'Stale spike on caching', updatedAt: '2026-08-05T09:00:00.000Z' }],
			],
			[
				'One Issue At A Time',
				[{ id: 'iss_5', title: 'Stale spike on caching', updatedAt: '2026-08-05T09:00:00.000Z' }],
			],
			[
				'Draft The Nudge',
				[{ text: 'Any movement on the caching spike? It has been quiet for three weeks.' }],
			],
			['Add Nudge Comment', []],
		],
	},
];

/**
 * Instance AI conversations about the seeded estate, so the assistant panel opens onto something
 * with history rather than a blank thread.
 *
 * `content` on each message is stored as JSON exactly as the agent memory writes it: a message
 * object whose `content` is an array of parts. User turns carry the `<current-date-time>` block
 * the service appends per turn — the message parser strips it before display, so it is invisible
 * in the UI and visible to the model, which is the point of seeding it at all.
 */
export const THREADS = [
	{
		id: 'seedAlThread000000000000000000001',
		title: 'Why is the stale issue nudger failing',
		createdMinutesAgo: 150,
		updatedMinutesAgo: 130,
		messages: [
			['user', 'The nudge workflow has failed twice this morning. What is going on?'],
			[
				'assistant',
				'Both runs failed on the same node, "Add Nudge Comment", with the Linear API rejecting an empty issueId. The comment node reads the issue id from `$json`, but the node directly upstream of it is the LLM chain, whose output is `{ text: ... }` — it has no id. It needs to read the id back from the loop node instead, with `$(\'One Issue At A Time\').item.json.id`.',
			],
			['user', 'Can you fix it?'],
			[
				'assistant',
				'That is a one-line change to the comment node. Before I touch a published workflow: do you want me to edit "[seed-al] Nudge stale Linear issues" directly, or make the change and leave it unpublished for you to check first?',
			],
		],
	},
	{
		id: 'seedAlThread000000000000000000002',
		title: 'Adding a component to the triage table',
		createdMinutesAgo: 60 * 5,
		updatedMinutesAgo: 60 * 5 - 8,
		messages: [
			['user', 'A bug came in about the mobile app and it did not get routed anywhere.'],
			[
				'assistant',
				'The triage run at 06:12 extracted component "mobile", found no matching row in seed_al_triage_routing, and took the unrouted branch — it created APP-201 at priority 3 with a note saying to add a rule. So the workflow behaved correctly; the table is what is missing a row. Adding one means no workflow edit: component "mobile", a Linear team key, a priority, and an owner.',
			],
			['user', 'Use APP, priority 2, owner Noor.'],
			[
				'assistant',
				'I can add that row to seed_al_triage_routing. Worth knowing: the routing lookup matches on an exact component string, so a report the extractor calls "ios" or "android" will still fall through. If you want those to land on the same team, they each need their own row.',
			],
		],
	},
	{
		id: 'seedAlThread000000000000000000003',
		title: 'Standup digest wording',
		createdMinutesAgo: 60 * 26,
		updatedMinutesAgo: 60 * 26 - 5,
		messages: [
			[
				'user',
				'The daily digest reads like a list. Can it say what actually changed since yesterday?',
			],
			[
				'assistant',
				'Not from what it currently fetches. The Linear node pulls the current state of each issue, so the digest has no idea what any of them looked like yesterday — the prompt can only describe a snapshot. To compare, it needs the previous snapshot stored somewhere between runs: a data table keyed by issue id, written at the end of each run and read at the start of the next.',
			],
		],
	},
	{
		id: 'seedAlThread000000000000000000004',
		title: 'Tier lookups in the support assistant',
		createdMinutesAgo: 60 * 60,
		updatedMinutesAgo: 60 * 60 - 12,
		messages: [
			['user', 'Should the support assistant escalate everything from enterprise customers?'],
			[
				'assistant',
				'The customer tier table already carries an `escalate` flag per domain, and both enterprise domains have it set — so the agent has what it needs to decide without a rule in the prompt. What it does not have is a way to tell an enterprise question from an enterprise defect, and escalating every question would bury the engineering queue. The system message currently says to escalate on the flag *or* a genuine defect; tightening that to require both is a one-line change if you want the stricter behaviour.',
			],
		],
	},
];

/**
 * Activity entries that are not derivable from the executions. Workflow and data-table lifecycle:
 * things that happened but left no run behind. Run entries are generated from EXECUTIONS instead,
 * so their ids and statuses cannot drift from the executions they describe.
 */
export const ACTIVITY = [
	['workflow', 'saved', 'seedAlWf00000001', { nodeCount: 8, nodeDelta: 2 }, 60 * 24 * 11],
	['workflow', 'published', 'seedAlWf00000002', null, 60 * 24 * 11],
	['workflow', 'published', 'seedAlWf00000006', null, 60 * 24 * 3],
	['workflow', 'saved', 'seedAlWf00000005', { nodeCount: 8, nodeDelta: 1 }, 60 * 24 * 2],
	['workflow', 'saved', 'seedAlWf00000009', { nodeCount: 8, nodeDelta: 3 }, 60 * 24],
	['workflow', 'saved', 'seedAlWf00000003', { nodeCount: 6, nodeDelta: 1 }, 90],
	['workflow', 'saved', 'seedAlWf00000007', { nodeCount: 6, nodeDelta: 3 }, 25],
];
