import type { INodeProperties } from 'n8n-workflow';

export const searchscraperOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['searchscraper'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				action: 'Search and scrape web content using AI',
			},
		],
		default: 'search',
	},
];

export const searchscraperFields: INodeProperties[] = [
	{
		displayName: 'User Prompt',
		name: 'userPrompt',
		type: 'string',
		required: true,
		default: '',
		description: 'Search query or instructions for what to search and extract',
		displayOptions: {
			show: {
				resource: ['searchscraper'],
				operation: ['search'],
			},
		},
	},
]; 