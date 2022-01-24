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
		displayName: 'Add Optional Field',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Add field and value',
		placeholder: 'Add Optional Field',
		displayOptions: {
			show: {
				operation: ['update', 'create'],
				resource: ['client'],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'options',
						noDataExpression: true,
						// nodelinter-ignore-next-line
						default: '',
						required: true,
						description: 'Client field name',
						options: [
							{
								name: 'Important Client',
								value: 'is_vip',
							},
							{
								name: 'Account Status',
								value: 'inactive',
							},
							{
								name: 'Reference',
								value: 'ref',
							},
							{
								name: 'Website',
								value: 'website',
							},
							{
								name: 'Next Call Date',
								value: 'calldate',
							},
							{
								name: 'Notes',
								value: 'notes',
							},
						],
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						required: true,
						displayOptions: {
							show: {
								fieldName: ['ref', 'website', 'notes'],
							},
						},
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'boolean',
						default: false,
						required: true,
						displayOptions: {
							show: {
								fieldName: ['is_vip', 'inactive'],
							},
						},
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'dateTime',
						default: '',
						description: 'The next call date',
						required: true,
						displayOptions: {
							show: {
								fieldName: ['calldate'],
							},
						},
					},
				],
			},
		],
	},
];
