import {
	INodeProperties,
} from 'n8n-workflow';

import { 
	filters,
} from './Filters';

export const databaseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a database.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all databases.',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query a database.',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const databaseFields = [

	/* -------------------------------------------------------------------------- */
	/*                                database:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'get',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                database:query                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDatabases',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'query',
				],
				resource: [
					'database',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Filters',
				name: 'filter',
				placeholder: 'Add Filter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Single Condition',
						name: 'singleCondition',
						values: [
							...filters,
						],
					},
					{
						displayName: 'Multiple Condition',
						name: 'multipleCondition',
						values: [
							{
								displayName: 'Condition',
								name: 'condition',
								placeholder: 'Add Condition',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'OR',
										name: 'or',
										values: [
											...filters,
										],
									},
									{
										displayName: 'AND',
										name: 'and',
										values: [
											...filters,
										],
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Sort',
						name: 'sortValue',
						values: [
							{
								displayName: 'Property Name',
								name: 'key',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getFilterProperties',
									loadOptionsDependsOn: [
										'datatabaseId',
									],
								},
								default: '',
								description: 'The name of the property to filter by.',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'hidden',
								default: '={{$parameter["&key"].split("|")[1]}}',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'Ascending',
										value: 'ascending',
									},
									{
										name: 'Descending',
										value: 'descending',
									},
								],
								default: '',
								description: 'The direction to sort.',
							},
							// {
							// 	displayName: 'Timestamp',
							// 	name: 'timestamp',
							// 	type: 'options',
							// 	options: [
							// 		{
							// 			name: 'Last Edited Time',
							// 			value: 'last_edited_time',
							// 		},
							// 	],
							// 	default: 'last_edited_time',
							// 	description: `The name of the timestamp to sort against.`,
							// },
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
