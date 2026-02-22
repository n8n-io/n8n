import type { INodeProperties } from 'n8n-workflow';

export const batchCallOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['batchCall'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a batch of outbound phone calls',
				action: 'Create a batch call',
			},
		],
		default: 'create',
	},
];

export const batchCallFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                           batchCall:create                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'From Number',
		name: 'fromNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['batchCall'],
				operation: ['create'],
			},
		},
		default: '',
		placeholder: '+14155551234',
		description:
			'Your phone number in E.164 format. Must be a number purchased from or imported to Retell.',
	},
	{
		displayName: 'Tasks',
		name: 'tasks',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['batchCall'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add Task',
		description: 'List of individual call tasks to include in the batch',
		options: [
			{
				name: 'taskValues',
				displayName: 'Task',
				values: [
					{
						displayName: 'To Number',
						name: 'toNumber',
						type: 'string',
						required: true,
						default: '',
						placeholder: '+14155555678',
						description: 'Destination phone number in E.164 format',
					},
					{
						displayName: 'Override Agent ID',
						name: 'overrideAgentId',
						type: 'string',
						default: '',
						description: 'Override agent for this specific call',
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'Arbitrary key-value pairs to store with the call',
					},
					{
						displayName: 'Retell LLM Dynamic Variables',
						name: 'retellLlmDynamicVariables',
						type: 'json',
						default: '{}',
						description:
							'Key-value string pairs injected into Response Engine prompt for personalization',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['batchCall'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Batch call identifier for your reference',
			},
			{
				displayName: 'Trigger Timestamp',
				name: 'triggerTimestamp',
				type: 'number',
				default: 0,
				description:
					'Unix timestamp in milliseconds for scheduled sending. Omit or set to 0 for immediate dispatch.',
			},
		],
	},
];
