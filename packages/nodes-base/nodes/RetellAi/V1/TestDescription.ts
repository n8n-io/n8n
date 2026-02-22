import type { INodeProperties } from 'n8n-workflow';

export const testOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['test'],
			},
		},
		options: [
			{
				name: 'Create Batch Test',
				value: 'createBatchTest',
				description: 'Create a batch test from test case definitions',
				action: 'Create a batch test',
			},
			{
				name: 'Create Test Case',
				value: 'createTestCase',
				description: 'Create a test case definition',
				action: 'Create a test case',
			},
			{
				name: 'Delete Test Case',
				value: 'deleteTestCase',
				description: 'Delete a test case definition',
				action: 'Delete a test case',
			},
			{
				name: 'Get Batch Test',
				value: 'getBatchTest',
				description: 'Get a batch test by ID',
				action: 'Get a batch test',
			},
			{
				name: 'Get Batch Tests',
				value: 'getBatchTests',
				description: 'Get all batch tests',
				action: 'Get all batch tests',
			},
			{
				name: 'Get Test Case',
				value: 'getTestCase',
				description: 'Get a test case definition by ID',
				action: 'Get a test case',
			},
			{
				name: 'Get Test Cases',
				value: 'getTestCases',
				description: 'Get all test case definitions',
				action: 'Get all test cases',
			},
			{
				name: 'Get Test Run',
				value: 'getTestRun',
				description: 'Get a test run by ID',
				action: 'Get a test run',
			},
			{
				name: 'Get Test Runs',
				value: 'getTestRuns',
				description: 'Get all test runs for a batch test',
				action: 'Get all test runs',
			},
			{
				name: 'Update Test Case',
				value: 'updateTestCase',
				description: 'Update a test case definition',
				action: 'Update a test case',
			},
		],
		default: 'createTestCase',
	},
];

export const testFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                          test:createTestCase                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createTestCase'],
			},
		},
		default: '',
		description: 'Name of the test case definition',
	},
	{
		displayName: 'Response Engine Type',
		name: 'responseEngineType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createTestCase'],
			},
		},
		options: [
			{
				name: 'Conversation Flow',
				value: 'conversation-flow',
			},
			{
				name: 'Retell LLM',
				value: 'retell-llm',
			},
		],
		default: 'retell-llm',
		description: 'The type of response engine to use for the test case',
	},
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createTestCase'],
				responseEngineType: ['retell-llm'],
			},
		},
		default: '',
		description: 'The ID of the Retell LLM to use',
	},
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createTestCase'],
				responseEngineType: ['conversation-flow'],
			},
		},
		default: '',
		description: 'The ID of the conversation flow to use',
	},
	{
		displayName: 'User Prompt',
		name: 'userPrompt',
		type: 'string',
		required: true,
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createTestCase'],
			},
		},
		default: '',
		description: 'User prompt to simulate in the test case',
	},
	{
		displayName: 'Metrics',
		name: 'metrics',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createTestCase'],
			},
		},
		default: '',
		placeholder: 'metric1, metric2, metric3',
		description: 'Comma-separated list of metric names to evaluate',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createTestCase'],
			},
		},
		options: [
			{
				displayName: 'Dynamic Variables',
				name: 'dynamicVariables',
				type: 'json',
				default: '{}',
				description: 'Key-value pairs of dynamic variables to inject into the response engine',
			},
			{
				displayName: 'LLM Model',
				name: 'llmModel',
				type: 'options',
				default: 'gpt-4.1',
				options: [
					{ name: 'Claude 4.5 Haiku', value: 'claude-4.5-haiku' },
					{ name: 'Claude 4.5 Sonnet', value: 'claude-4.5-sonnet' },
					{ name: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
					{ name: 'Gemini 2.5 Flash Lite', value: 'gemini-2.5-flash-lite' },
					{ name: 'Gemini 3.0 Flash', value: 'gemini-3.0-flash' },
					{ name: 'GPT-4.1', value: 'gpt-4.1' },
					{ name: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
					{ name: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
					{ name: 'GPT-5', value: 'gpt-5' },
					{ name: 'GPT-5 Mini', value: 'gpt-5-mini' },
					{ name: 'GPT-5 Nano', value: 'gpt-5-nano' },
					{ name: 'GPT-5.1', value: 'gpt-5.1' },
					{ name: 'GPT-5.2', value: 'gpt-5.2' },
				],
				description: 'LLM model to use for simulation',
			},
			{
				displayName: 'Response Engine Version',
				name: 'responseEngineVersion',
				type: 'number',
				default: 0,
				description:
					'Version of the response engine to use. Leave at 0 to use the latest version.',
			},
			{
				displayName: 'Tool Mocks',
				name: 'toolMocks',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool mock definitions. Each mock should include tool_name, input_match_rule, output, and optionally result.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                           test:getTestCase                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Test Case Definition ID',
		name: 'testCaseDefinitionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getTestCase'],
			},
		},
		default: '',
		description: 'The ID of the test case definition to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                          test:getTestCases                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Response Engine Type',
		name: 'responseEngineType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getTestCases'],
			},
		},
		options: [
			{
				name: 'Conversation Flow',
				value: 'conversation-flow',
			},
			{
				name: 'Retell LLM',
				value: 'retell-llm',
			},
		],
		default: 'retell-llm',
		description: 'The type of response engine to filter test cases by',
	},
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getTestCases'],
				responseEngineType: ['retell-llm'],
			},
		},
		default: '',
		description: 'The ID of the Retell LLM to filter test cases by',
	},
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getTestCases'],
				responseEngineType: ['conversation-flow'],
			},
		},
		default: '',
		description: 'The ID of the conversation flow to filter test cases by',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getTestCases'],
			},
		},
		options: [
			{
				displayName: 'Version',
				name: 'version',
				type: 'number',
				default: 0,
				description:
					'Version of the response engine to filter by. Leave at 0 to use the latest version.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                         test:updateTestCase                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Test Case Definition ID',
		name: 'testCaseDefinitionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['updateTestCase'],
			},
		},
		default: '',
		description: 'The ID of the test case definition to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['updateTestCase'],
			},
		},
		options: [
			{
				displayName: 'Dynamic Variables',
				name: 'dynamicVariables',
				type: 'json',
				default: '{}',
				description: 'Key-value pairs of dynamic variables to inject into the response engine',
			},
			{
				displayName: 'LLM Model',
				name: 'llmModel',
				type: 'options',
				default: 'gpt-4.1',
				options: [
					{ name: 'Claude 4.5 Haiku', value: 'claude-4.5-haiku' },
					{ name: 'Claude 4.5 Sonnet', value: 'claude-4.5-sonnet' },
					{ name: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
					{ name: 'Gemini 2.5 Flash Lite', value: 'gemini-2.5-flash-lite' },
					{ name: 'Gemini 3.0 Flash', value: 'gemini-3.0-flash' },
					{ name: 'GPT-4.1', value: 'gpt-4.1' },
					{ name: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
					{ name: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
					{ name: 'GPT-5', value: 'gpt-5' },
					{ name: 'GPT-5 Mini', value: 'gpt-5-mini' },
					{ name: 'GPT-5 Nano', value: 'gpt-5-nano' },
					{ name: 'GPT-5.1', value: 'gpt-5.1' },
					{ name: 'GPT-5.2', value: 'gpt-5.2' },
				],
				description: 'LLM model to use for simulation',
			},
			{
				displayName: 'Metrics',
				name: 'metrics',
				type: 'string',
				default: '',
				placeholder: 'metric1, metric2, metric3',
				description: 'Comma-separated list of metric names to evaluate',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the test case definition',
			},
			{
				displayName: 'Response Engine',
				name: 'responseEngine',
				type: 'json',
				default: '{}',
				description:
					'Response engine configuration as JSON. Example: {"type": "retell-llm", "llm_id": "your_id"}',
			},
			{
				displayName: 'Tool Mocks',
				name: 'toolMocks',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool mock definitions. Each mock should include tool_name, input_match_rule, output, and optionally result.',
			},
			{
				displayName: 'User Prompt',
				name: 'userPrompt',
				type: 'string',
				default: '',
				description: 'User prompt to simulate in the test case',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                         test:deleteTestCase                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Test Case Definition ID',
		name: 'testCaseDefinitionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['deleteTestCase'],
			},
		},
		default: '',
		description: 'The ID of the test case definition to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                         test:createBatchTest                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createBatchTest'],
			},
		},
		default: '',
		description: 'Name of the batch test',
	},
	{
		displayName: 'Test Case Definition IDs',
		name: 'testCaseDefinitionIds',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createBatchTest'],
			},
		},
		default: '',
		placeholder: 'id1, id2, id3',
		description:
			'Comma-separated list of test case definition IDs to include in the batch (max 200)',
	},
	{
		displayName: 'Response Engine Type',
		name: 'responseEngineType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createBatchTest'],
			},
		},
		options: [
			{
				name: 'Conversation Flow',
				value: 'conversation-flow',
			},
			{
				name: 'Retell LLM',
				value: 'retell-llm',
			},
		],
		default: 'retell-llm',
		description: 'The type of response engine to use for the batch test',
	},
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createBatchTest'],
				responseEngineType: ['retell-llm'],
			},
		},
		default: '',
		description: 'The ID of the Retell LLM to use',
	},
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createBatchTest'],
				responseEngineType: ['conversation-flow'],
			},
		},
		default: '',
		description: 'The ID of the conversation flow to use',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['createBatchTest'],
			},
		},
		options: [
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description: 'The agent ID to associate with the batch test',
			},
			{
				displayName: 'Agent Version',
				name: 'agentVersion',
				type: 'number',
				default: 0,
				description: 'The agent version to use for the batch test',
			},
			{
				displayName: 'Response Engine Version',
				name: 'responseEngineVersion',
				type: 'number',
				default: 0,
				description:
					'Version of the response engine to use. Leave at 0 to use the latest version.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                          test:getBatchTest                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Batch Test ID',
		name: 'batchTestId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getBatchTest'],
			},
		},
		default: '',
		description: 'The ID of the batch test job to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                         test:getBatchTests                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Response Engine Type',
		name: 'responseEngineType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getBatchTests'],
			},
		},
		options: [
			{
				name: 'Conversation Flow',
				value: 'conversation-flow',
			},
			{
				name: 'Retell LLM',
				value: 'retell-llm',
			},
		],
		default: 'retell-llm',
		description: 'The type of response engine to filter batch tests by',
	},
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getBatchTests'],
				responseEngineType: ['retell-llm'],
			},
		},
		default: '',
		description: 'The ID of the Retell LLM to filter batch tests by',
	},
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getBatchTests'],
				responseEngineType: ['conversation-flow'],
			},
		},
		default: '',
		description: 'The ID of the conversation flow to filter batch tests by',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getBatchTests'],
			},
		},
		options: [
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description: 'Filter batch tests by agent ID',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'number',
				default: 0,
				description:
					'Version of the response engine to filter by. Leave at 0 to use the latest version.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                           test:getTestRun                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Test Run ID',
		name: 'testRunId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getTestRun'],
			},
		},
		default: '',
		description: 'The ID of the test run to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                          test:getTestRuns                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Batch Test ID',
		name: 'batchTestId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['test'],
				operation: ['getTestRuns'],
			},
		},
		default: '',
		description: 'The ID of the batch test job to list runs for',
	},
];
