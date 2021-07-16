import { INodeProperties } from 'n8n-workflow';

export const siteOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'createSite',
				description: 'Create a new site',
			},
			{
				name: 'Delete',
				value: 'deleteSite',
				description: 'Delete a site',
			},
			{
				name: 'Get Site',
				value: 'getSite',
				description: 'Returns the specified site',
			},
			{
				name: 'Get All Sites',
				value: 'getAllSites',
				description: 'Returns all sites you have access to',
			},
		],
		default: 'getAllSites',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const siteFields = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAllSites',
				],
				resource: [
					'site',
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
				operation: [
					'getAllSites',
				],
				resource: [
					'site',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 50,
		description: 'How many results to return.',
	},
] as INodeProperties[];
