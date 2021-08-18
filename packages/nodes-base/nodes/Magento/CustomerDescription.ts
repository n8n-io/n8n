import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getCustomerOptionalFields,
	getSearchFilters,
} from './GenericFunctions';

export const customerOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new customer',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a customer',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a customer',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all customers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a customer',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const customerFields = [

	/* -------------------------------------------------------------------------- */
	/*                                   customer:create			              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		default: '',
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
		description: 'Email Address',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
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
		description: 'Email Address',
	},
	{
		displayName: 'First Name',
		name: 'firstname',
		type: 'string',
		required: true,
		default: '',
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
		description: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastname',
		type: 'string',
		required: true,
		default: '',
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
		description: '',
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
		options: [
			...getCustomerOptionalFields(),
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
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
			...getCustomerOptionalFields(),
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   customer:delete			              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                   customer:getAll			              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return',
	},
	...getSearchFilters('customer', 'getSystemAttributes'),


] as INodeProperties[];
