import type { INodeProperties } from 'n8n-workflow';

export const subaccountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['subaccount'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new subaccount',
				action: 'Create a subaccount',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a subaccount',
				action: 'Delete a subaccount',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many subaccounts or a specific one',
				action: 'Get subaccounts',
			},
			{
				name: 'Set Auto Transfer',
				value: 'setAutoTransfer',
				description: 'Configure automatic credit transfer',
				action: 'Set auto transfer',
			},
			{
				name: 'Transfer Credits',
				value: 'transferCredits',
				description: 'Manually transfer credits',
				action: 'Transfer credits',
			},
		],
		default: 'getAll',
	},
];

export const subaccountFields: INodeProperties[] = [
	{
		displayName: 'Subaccount ID',
		name: 'subaccountId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['subaccount'],
				operation: ['getAll'],
			},
		},
		description: 'Optional. Provide to fetch a specific subaccount.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['subaccount'],
				operation: ['create'],
			},
		},
		description: 'Full first and last name of account owner',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@example.com',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['subaccount'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Subaccount ID',
		name: 'subaccountId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['subaccount'],
				operation: ['setAutoTransfer', 'transferCredits', 'delete'],
			},
		},
	},
	{
		displayName: 'Threshold',
		name: 'threshold',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['subaccount'],
				operation: ['setAutoTransfer'],
			},
		},
		description: 'Balance level triggering automatic transfer',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['subaccount'],
				operation: ['setAutoTransfer', 'transferCredits'],
			},
		},
		description: 'Credit amount. For setAutoTransfer, set to 0 to deactivate.',
	},
];
