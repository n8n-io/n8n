import type { INodeProperties } from 'n8n-workflow';

export const journalOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['journal'],
			},
		},
		options: [
			{
				name: 'Get Outbound',
				value: 'getOutbound',
				description: 'Query sent messages',
				action: 'Get outbound messages',
			},
			{
				name: 'Get Inbound',
				value: 'getInbound',
				description: 'Retrieve received SMS messages',
				action: 'Get inbound messages',
			},
			{
				name: 'Get Voice',
				value: 'getVoice',
				description: 'Access voice message logs',
				action: 'Get voice logs',
			},
		],
		default: 'getOutbound',
	},
];

export const journalFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['journal'],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Specific message identifier',
			},
			{
				displayName: 'Date From',
				name: 'date_from',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
			},
			{
				displayName: 'Date To',
				name: 'date_to',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				placeholder: 'completed',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
			},
		],
	},
];
