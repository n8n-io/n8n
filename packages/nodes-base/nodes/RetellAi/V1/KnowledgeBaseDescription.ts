import type { INodeProperties } from 'n8n-workflow';

export const knowledgeBaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
			},
		},
		options: [
			{
				name: 'Add Sources',
				value: 'addSources',
				description: 'Add sources to an existing knowledge base',
				action: 'Add sources to a knowledge base',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new knowledge base',
				action: 'Create a knowledge base',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a knowledge base',
				action: 'Delete a knowledge base',
			},
			{
				name: 'Delete Source',
				value: 'deleteSource',
				description: 'Delete a source from a knowledge base',
				action: 'Delete a source from a knowledge base',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a knowledge base by ID',
				action: 'Get a knowledge base',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many knowledge bases',
				action: 'Get many knowledge bases',
			},
		],
		default: 'getMany',
	},
];

export const knowledgeBaseFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                         knowledgeBase:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Knowledge Base Name',
		name: 'knowledgeBaseName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name for the knowledge base. Must be under 40 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Enable Auto Refresh',
				name: 'enableAutoRefresh',
				type: 'boolean',
				default: false,
				description: 'Whether to re-scrape URLs every 12 hours',
			},
			{
				displayName: 'Knowledge Base Texts',
				name: 'knowledgeBaseTexts',
				type: 'json',
				default: '[]',
				description:
					'JSON array of text entries to add. Each entry must have "title" and "text" fields. Example: [{"title": "FAQ", "text": "Answer content"}].',
			},
			{
				displayName: 'Knowledge Base URLs',
				name: 'knowledgeBaseUrls',
				type: 'json',
				default: '[]',
				description:
					'JSON array of web URLs to scrape and index. Example: ["https://example.com/page1", "https://example.com/page2"].',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                           knowledgeBase:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Knowledge Base ID',
		name: 'knowledgeBaseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the knowledge base to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                         knowledgeBase:getMany                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['getMany'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                         knowledgeBase:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Knowledge Base ID',
		name: 'knowledgeBaseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The ID of the knowledge base to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                       knowledgeBase:addSources                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Knowledge Base ID',
		name: 'knowledgeBaseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['addSources'],
			},
		},
		default: '',
		description: 'The ID of the knowledge base to add sources to',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['addSources'],
			},
		},
		options: [
			{
				displayName: 'Knowledge Base Texts',
				name: 'knowledgeBaseTexts',
				type: 'json',
				default: '[]',
				description:
					'JSON array of text entries to add. Each entry must have "title" and "text" fields. Example: [{"title": "FAQ", "text": "Answer content"}].',
			},
			{
				displayName: 'Knowledge Base URLs',
				name: 'knowledgeBaseUrls',
				type: 'json',
				default: '[]',
				description:
					'JSON array of web URLs to scrape and index. Example: ["https://example.com/page1", "https://example.com/page2"].',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                      knowledgeBase:deleteSource                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Knowledge Base ID',
		name: 'knowledgeBaseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['deleteSource'],
			},
		},
		default: '',
		description: 'The ID of the knowledge base containing the source',
	},
	{
		displayName: 'Source ID',
		name: 'sourceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['deleteSource'],
			},
		},
		default: '',
		description: 'The ID of the source to delete from the knowledge base',
	},
];
