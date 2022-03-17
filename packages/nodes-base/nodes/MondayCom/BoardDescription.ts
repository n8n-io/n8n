import {
	INodeProperties,
} from 'n8n-workflow';

export const boardOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'board',
				],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a board',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new board',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a board',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all boards',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const boardFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 board:archive                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'archive',
				],
			},
		},
		description: 'Board unique identifiers.',
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
				operation: [
					'create',
				],
				resource: [
					'board',
				],
			},
		},
		default: '',
		description: `The board's name`,
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
				operation: [
					'create',
				],
				resource: [
					'board',
				],
			},
		},
		default: '',
		description: `The board's kind (public / private / share)`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'board',
				],
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
				description: 'Optional board template id',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                  board:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Board unique identifiers.',
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
				resource: [
					'board',
				],
				operation: [
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
					'board',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
];
