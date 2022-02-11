import {
	INodeProperties,
} from 'n8n-workflow';

export const checkAccountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all check accounts',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a check account',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a check account',
			},
		],
		default: 'getAll',
	},
];

export const checkAccountFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	// ----------------------------------------
	//           checkAccount: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of check account',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		description: 'The type of the check account. Account with a CSV or MT940 import are regarded as online. Apart from that, created check accounts over the API need to be offline, as online accounts with an active connection to a bank application can not be managed over the API.',
		type: 'string',
		required: true,
		default: 'offline',
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Currency',
		name: 'currency',
		description: 'The currency of the check account',
		type: 'string',
		required: true,
		default: 'EUR',
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		description: 'Status of the check account. 0 <-> Archived - 100 <-> Active.',
		type: 'number',
		required: true,
		default: '100',
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Import Type',
				name: 'importType',
				type: 'string',
				default: 'CSV',
				description: 'Import type. Transactions can be imported by this method on the check account. Either "CSV" or "MT940"',
			},
			{
				displayName: 'Default Account',
				name: 'defaultAccount',
				type: 'boolean',
				default: false,
				description: 'Defines if this check account is the default account',
			},
			{
				displayName: 'Auto Map Transactions',
				name: 'autoMapTransactions',
				type: 'string',
				default: '1',
				description: 'Defines if transactions on this account are automatically mapped to invoice and vouchers when imported if possible.',
			},
		],
	},
	// ----------------------------------------
	//           checkAccount: update
	// ----------------------------------------
	{
		displayName: 'checkAccount ID',
		name: 'checkAccountId',
		description: 'ID of check account to update',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'checkAccount',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				description: 'Name of check account',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				description: 'The type of the check account. Account with a CSV or MT940 import are regarded as online. Apart from that, created check accounts over the API need to be offline, as online accounts with an active connection to a bank application can not be managed over the API.',
				type: 'string',
				default: 'offline',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				description: 'The currency of the check account',
				type: 'string',
				default: 'EUR',
			},
			{
				displayName: 'Status',
				name: 'status',
				description: 'Status of the check account. 0 <-> Archived - 100 <-> Active.',
				type: 'number',
				default: '100',
			},
			{
				displayName: 'Import Type',
				name: 'importType',
				type: 'string',
				default: 'CSV',
				description: 'Import type. Transactions can be imported by this method on the check account. Either "CSV" or "MT940"',
			},
			{
				displayName: 'Default Account',
				name: 'defaultAccount',
				type: 'boolean',
				default: false,
				description: 'Defines if this check account is the default account',
			},
			{
				displayName: 'Auto Map Transactions',
				name: 'autoMapTransactions',
				type: 'string',
				default: '1',
				description: 'Defines if transactions on this account are automatically mapped to invoice and vouchers when imported if possible.',
			},
		],
	},
];
