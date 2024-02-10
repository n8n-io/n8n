import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

export const rabbitDefaultOptions: Array<
	INodePropertyOptions | INodeProperties | INodePropertyCollection
> = [
	{
		displayName: 'Arguments',
		name: 'arguments',
		placeholder: 'Add Argument',
		description: 'Arguments to add',
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
		description: 'Headers to add',
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
		displayName: 'Auto Delete Queue',
		name: 'autoDelete',
		type: 'boolean',
		default: false,
		description: 'Whether the queue will be deleted when the number of consumers drops to zero',
	},
	{
		displayName: 'Assert Exchange',
		name: 'assertExchange',
		type: 'boolean',
		default: true,
		description: 'Whether to assert the exchange exists before sending',
	},
	{
		displayName: 'Assert Queue',
		name: 'assertQueue',
		type: 'boolean',
		default: true,
		description: 'Whether to assert the queue exists before sending',
	},
	{
		displayName: 'Durable',
		name: 'durable',
		type: 'boolean',
		default: true,
		description: 'Whether the queue will survive broker restarts',
	},
	{
		displayName: 'Exclusive',
		name: 'exclusive',
		type: 'boolean',
		default: false,
		description: 'Whether to scope the queue to the connection',
	},
];
