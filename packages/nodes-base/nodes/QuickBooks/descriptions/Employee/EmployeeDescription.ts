import {
	INodeProperties,
} from 'n8n-workflow';

import {
	employeeAdditionalFieldsOptions,
} from './EmployeeAdditionalFieldsOptions';

import {
	sortBy
} from 'lodash';

export const employeeOperations = [
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
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'employee',
				],
			},
		},
	},
] as INodeProperties[];

export const employeeFields = [
	// ----------------------------------
	//         employee: create
	// ----------------------------------
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		required: true,
		default: '',
		description: 'The display name of the bill to create.',
		displayOptions: {
			show: {
				resource: [
					'employee',
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
					'employee',
				],
				operation: [
					'create',
				],
			},
		},
		options: employeeAdditionalFieldsOptions,
	},
	// ----------------------------------
	//         employee: get
	// ----------------------------------
	{
		displayName: 'bill ID',
		name: 'billId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the bill to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'employee',
				],
				operation: [
					'get',
				],
			},
		},
	},
	// ----------------------------------
	//         employee: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'employee',
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
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'employee',
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'WHERE Metadata.LastUpdatedTime > \'2021-01-01\'',
				description: 'The condition for selecting employees. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">guide</a> for supported syntax.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
		displayOptions: {
			show: {
				resource: [
					'employee',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	// ----------------------------------
	//         employee: update
	// ----------------------------------
	{
		displayName: 'bill ID',
		name: 'billId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the bill to update.',
		displayOptions: {
			show: {
				resource: [
					'employee',
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
					'employee',
				],
				operation: [
					'update',
				],
			},
		},
		options: sortBy(
			[
				{
					displayName: 'Display Name',
					name: 'displayName',
					type: 'string',
					default: '',
				},
				...employeeAdditionalFieldsOptions,
			], o => o.displayName,
		),
	},
] as INodeProperties[];
