import {
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
} from 'n8n-workflow';

export const rabbitDefaultOptions: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection> = [
	{
		displayName: 'Arguments',
		name: 'arguments',
		placeholder: 'Add Argument',
		description: 'Arguments to add.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				name: 'argument',
				displayName: 'Argument',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Headers',
		name: 'headers',
		placeholder: 'Add Header',
		description: 'Headers to add.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				name: 'header',
				displayName: 'Header',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Auto Delete',
		name: 'autoDelete',
		type: 'boolean',
		default: false,
		description: 'The queue will be deleted when the number of consumers drops to zero .',
	},
	{
		displayName: 'Durable',
		name: 'durable',
		type: 'boolean',
		default: true,
		description: 'The queue will survive broker restarts.',
	},
	{
		displayName: 'Exclusive',
		name: 'exclusive',
		type: 'boolean',
		default: false,
		description: 'Scopes the queue to the connection.',
	},
];
