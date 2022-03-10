import {
	INodeProperties,
} from 'n8n-workflow';

export const issueOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an issue',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an issue',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all issues',
			},
		],
		default: 'create',
	},
];

export const issueFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 issue:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team Name/ID',
		name: 'teamId',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		default: '',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
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
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Assignee Name/ID',
				name: 'assigneeId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Priority Name/ID',
				name: 'priorityId',
				type: 'options',
				options: [
					{
						name: 'Urgent',
						value: 1,
					},
					{
						name: 'High',
						value: 2,
					},
					{
						name: 'Medium',
						value: 3,
					},
					{
						name: 'Low',
						value: 3,
					},
					{
						name: 'No Priority',
						value: 0,
					},
				],
				default: 0,
			},
			{
				displayName: 'State Name/ID',
				name: 'stateId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStates',
				},
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'get',
					'delete',
				],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 issue:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		description: 'Max number of results to return',
	},
];
