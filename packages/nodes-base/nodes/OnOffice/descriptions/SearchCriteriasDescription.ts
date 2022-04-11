import { INodeProperties } from 'n8n-workflow';

export const searchCriteriasOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['searchcriterias'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get all search criteria (fields + values) for a list of addresses or search criteria',
			},
		],
		default: 'read',
		description: 'The operation to perform.',
	},
];

export const searchCriteriasFields: INodeProperties[] = [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		required: true,
		default: 'searchcriteria',
		displayOptions: {
			show: {
				resource: ['searchcriterias'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Internal ID',
				value: 'internal',
				description: 'Returns the search criteria of the specified addresses. You specify the address via the internal address ID.',
			},
			{
				name: 'External ID',
				value: 'external',
				description: 'Returns all search criteria of the specified addresses. Here the external address numbers are used.',
			},
			{
				name: 'Searchcriteria ID',
				value: 'searchcriteria',
				description: 'Returns the search criteria for specified search criteria IDs',
			},
		],
		description: 'Type of transmitted IDs',
	},
	{
		displayName: 'IDs',
		name: 'ids',
		type: 'string',
		default: [],
		displayOptions: {
			show: {
				resource: ['searchcriterias'],
				operation: ['get'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		description: 'Array of IDs. The type of the ids depends on the mode.',
	},
];
