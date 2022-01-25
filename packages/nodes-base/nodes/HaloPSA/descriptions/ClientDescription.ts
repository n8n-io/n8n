import { INodeProperties } from 'n8n-workflow';

export const clientDescription: INodeProperties[] = [
	{
		displayName: 'Name:',
		name: 'clientName',
		type: 'string',
		default: '',
		description: 'Enter client name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['client'],
			},
		},
	},
	// Additional fields =============================================================
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
					'create',
				],
				resource: [
					'client',
				],
			},
		},
		options: [
			{
				displayName: 'Is VIP',
				name: 'is_vip',
				type: 'boolean',
				default: true,
				description: 'Whether the client is VIP or not',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
			},
		],
	},
];
