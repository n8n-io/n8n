import { INodeProperties } from 'n8n-workflow';

const opportunityFields: INodeProperties[] = [
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email_from',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Internal Notes',
		name: 'description',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Expected Closing',
		name: 'date_deadline',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Expected Revenue',
		name: 'expected_revenue',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Probability',
		name: 'probability',
		type: 'number',
		default: 0,
		typeOptions: {
			maxValue: 100,
			minValue: 0,
		},
	},
	{
		displayName: 'Priority',
		name: 'priority',
		type: 'options',
		default: '1',
		options: [
			{
				name: '1',
				value: '1',
			},
			{
				name: '2',
				value: '2',
			},
			{
				name: '3',
				value: '3',
			},
		],
	},
];

export const opportunityDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'opportunity',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['opportunity'],
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
				operation: ['create'],
				resource: ['opportunity'],
			},
		},
		options: [...opportunityFields],
	},
	// Update fields =============================================================
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['opportunity'],
			},
		},
		options: [
			{
				displayName: 'Opportunity',
				name: 'name',
				type: 'string',
				default: '',
			},
			...opportunityFields,
		],
	},
];
