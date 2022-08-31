import { INodeProperties } from 'n8n-workflow';

export const boardOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['board'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a board',
				action: 'Archive a board',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new board',
				action: 'Create a board',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a board',
				action: 'Get a board',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all boards',
				action: 'Get all boards',
			},
		],
		default: 'create',
	},
];

export const boardFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 board:archive                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
		name: 'boardId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['board'],
				operation: ['archive'],
			},
		},
		description:
			'Board unique identifiers. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 board:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['board'],
			},
		},
		default: '',
		description: "The board's name",
	},
	{
		displayName: 'Kind',
		name: 'kind',
		type: 'options',
		options: [
			{
				name: 'Share',
				value: 'share',
			},
			{
				name: 'Public',
				value: 'public',
			},
			{
				name: 'Private',
				value: 'private',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['board'],
			},
		},
		default: '',
		description: "The board's kind (public / private / share)",
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['board'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Optional board template ID',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  board:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
		name: 'boardId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['board'],
				operation: ['get'],
			},
		},
		description:
			'Board unique identifiers. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                  board:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['board'],
				operation: ['getAll'],
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
				resource: ['board'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
