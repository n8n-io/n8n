import { INodeProperties } from 'n8n-workflow';

export const addConfigFields: INodeProperties[] = [
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['addConfig'],
			},
		},
		default: '',
		placeholder: 'user.email',
		description: 'Name of the key to set',
		required: true,
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['addConfig'],
			},
		},
		default: '',
		placeholder: 'name@example.com',
		description: 'Value of the key to set',
		required: true,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['addConfig'],
			},
		},
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Append',
						value: 'append',
					},
					{
						name: 'Set',
						value: 'set',
					},
				],
				default: 'set',
				description: 'Append setting rather than set it in the local config',
			},
		],
	},
];
