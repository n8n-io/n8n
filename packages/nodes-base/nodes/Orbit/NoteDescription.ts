import {
	INodeProperties,
} from 'n8n-workflow';

export const noteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'note',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a note',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all notes for a member',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a note',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const noteFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                note:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The workspace',
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'create',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                note:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'getAll',
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
				operation: [
					'getAll',
				],
				resource: [
					'note',
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
					'getAll',
				],
				resource: [
					'note',
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
		displayName: 'Resolve Member',
		name: 'resolveMember',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'note',
				],
			},
		},
		default: false,
	},

	/* -------------------------------------------------------------------------- */
	/*                                note:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
				operation: [
					'update',
				],
			},
		},
	},
];
