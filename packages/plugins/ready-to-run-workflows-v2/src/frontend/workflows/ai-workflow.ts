import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const READY_TO_RUN_WORKFLOW_V1: WorkflowDataCreate = {
	name: 'AI Agent workflow',
	meta: { templateId: 'ready-to-run-ai-workflow-v1' },
	nodes: [
		{
			parameters: {
				url: 'https://www.theverge.com/rss/index.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [-16, 768],
			id: '303e9b4e-cc4e-4d8a-8ede-7550f070d212',
			name: 'Get Tech News',
		},
		{
			parameters: {
				toolDescription: 'Reads the news',
				url: '=https://feeds.bbci.co.uk/news/world/rss.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [112, 768],
			id: '4090a753-f131-40b1-87c3-cf74d5a7e325',
			name: 'Get World News',
		},
		{
			parameters: {
				rule: {
					interval: [
						{
							triggerAtHour: 7,
						},
					],
				},
			},
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [-560, 752],
			id: '651543b5-0213-433f-8760-57d62b8d6d64',
			name: 'Run every day at 7AM',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: '85b5c530-2c13-4424-ab83-05979bc879a5',
							name: 'output',
							value: '={{ $json.output }}',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [160, 544],
			id: '99f7bb9e-f8c0-43ca-a9a8-a76634ac9611',
			name: 'Output',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [-560, 544],
			id: 'a0390291-6794-4673-9a6a-5c3d3a5d9e4b',
			name: 'Click ‘Execute workflow’ to run',
		},
		{
			parameters: {
				content: '## ⚡ Start here:',
				height: 240,
				width: 224,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-624, 464],
			id: 'fac5929f-e065-4474-96b1-7bcc06834238',
			name: 'Sticky Note',
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: 'list',
					value: 'gpt-4.1-mini',
				},
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1.2,
			position: [-272, 768],
			id: 'b16482e8-0d48-4426-aa93-c3fee11dd3cd',
			name: 'OpenAI Model',
			notesInFlow: true,
			credentials: {},
			notes: 'Double-click to open',
		},
		{
			parameters: {
				promptType: 'define',
				text: '=Summarize world news and tech news from the last 24 hours. \nSkip your comments. \nThe titles should be "World news:" and "Tech news:" \nToday is {{ $today }}',
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 2.2,
			position: [-272, 544],
			id: '084d56aa-d157-4964-9073-b36d9d9589c5',
			name: 'AI Summary Agent',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {
				content: '### Double click here to see the results:',
				height: 240,
				width: 192,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [112, 464],
			id: 'a4b7a69a-0db8-4b9b-a81d-fd83378043a3',
			name: 'Sticky Note1',
		},
		{
			parameters: {
				content:
					'### 📰 Daily AI Summary\n\n\nThis workflow gets the latest news and asks AI to summarize it for you.\n\n⭐ Bonus: Send the summary via email by connecting your Gmail account\n\n\n\n@[youtube](cMyOkQ4N-5M)',
				height: 432,
				width: 384,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-1152, 464],
			id: '74d80857-5e63-47a8-8e86-8ecd10fd5f9e',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				subject: 'Your news daily summary',
				emailType: 'text',
				message: '={{ $json.output }}',
				options: {},
			},
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.1,
			position: [432, 544],
			id: '45625d0d-bf26-4379-9eed-7bbc8e5d87a5',
			name: 'Send summary by email',
			webhookId: '093b04f1-5e78-4926-9863-1b100d6f2ead',
			notesInFlow: true,
			credentials: {},
			notes: 'Double-click to open',
		},
	],
	connections: {
		'Get Tech News': {
			ai_tool: [
				[
					{
						node: 'AI Summary Agent',
						type: 'ai_tool',
						index: 0,
					},
				],
			],
		},
		'Get World News': {
			ai_tool: [
				[
					{
						node: 'AI Summary Agent',
						type: 'ai_tool',
						index: 0,
					},
				],
			],
		},
		'Run every day at 7AM': {
			main: [
				[
					{
						node: 'AI Summary Agent',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Click ‘Execute workflow’ to run': {
			main: [
				[
					{
						node: 'AI Summary Agent',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'OpenAI Model': {
			ai_languageModel: [
				[
					{
						node: 'AI Summary Agent',
						type: 'ai_languageModel',
						index: 0,
					},
				],
			],
		},
		'AI Summary Agent': {
			main: [
				[
					{
						node: 'Output',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		Output: {
			main: [[]],
		},
	},
	pinData: {},
};
