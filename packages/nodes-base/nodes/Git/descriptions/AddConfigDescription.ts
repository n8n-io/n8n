import {
	INodeProperties,
} from 'n8n-workflow';

export const addConfigFields = [
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'addConfig',
				],
			},
		},
		default: '',
		placeholder: 'user.email',
		description: 'Name of the key to set.',
		required: true,
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'addConfig',
				],
			},
		},
		default: '',
		placeholder: 'name@example.com',
		description: 'Value of the key to set.',
		required: true,
	},
	{
		displayName: 'Append',
		name: 'append',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'addConfig',
				],
			},
		},
		default: false,
		description: 'Append setting rather than set it in the local config.',
		required: true,
	},
] as INodeProperties[];
