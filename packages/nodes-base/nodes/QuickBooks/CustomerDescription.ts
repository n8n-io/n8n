import {
	INodeProperties,
} from 'n8n-workflow';

import {
	customerAdditionalFields,
} from './CustomerAdditionalFields';

export const customerOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Search',
				value: 'search',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
			},
		},
	},
] as INodeProperties[];

export const customerFields = [
	// ----------------------------------
	//         customer: create
	// ----------------------------------
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		required: true,
		default: '',
		description: 'The display name of the customer to create',
		displayOptions: {
			show: {
				resource: [
					'customer',
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
					'customer',
				],
				operation: [
					'create',
				],
			},
		},
		options: customerAdditionalFields,
	},
	// ----------------------------------
	//         customer: get
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer to retrieve',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'get',
				],
			},
		},
	},
	// ----------------------------------
	//         customer: search
	// ----------------------------------
	{
		displayName: 'Select statement',
		name: 'selectStatement',
		type: 'string',
		required: true,
		default: '',
		description: 'The SQL statement to select customers with. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">"Search for shared drives"</a> guide for supported syntax.',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'search',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'search',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'search',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	// ----------------------------------
	//         customer: update
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer to update',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Display name',
				name: 'displayName',
				type: 'string',
				default: '',
			},
			...customerAdditionalFields,
		],
	},
] as INodeProperties[];
