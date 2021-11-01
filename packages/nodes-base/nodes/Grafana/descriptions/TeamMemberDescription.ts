import {
	INodeProperties,
} from 'n8n-workflow';

export const teamMemberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'teamMember',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a member to a team',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all team members',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Delete a member from a team',
			},
		],
		default: 'add',
	},
];

export const teamMemberFields: INodeProperties[] = [
	// ----------------------------------------
	//            teamMember: add
	// ----------------------------------------
	{
		displayName: 'User Name/ID',
		name: 'userId',
		description: 'User to add to a team. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				resource: [
					'teamMember',
				],
				operation: [
					'add',
				],
			},
		},
	},
	{
		displayName: 'Team Name/ID',
		name: 'teamId',
		description: 'Team to add the user to. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		displayOptions: {
			show: {
				resource: [
					'teamMember',
				],
				operation: [
					'add',
				],
			},
		},
	},

	// ----------------------------------------
	//            teamMember: remove
	// ----------------------------------------
	{
		displayName: 'User Name/ID',
		name: 'memberId',
		description: 'User to remove from the team. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				resource: [
					'teamMember',
				],
				operation: [
					'remove',
				],
			},
		},
	},
	{
		displayName: 'Team Name/ID',
		name: 'teamId',
		description: 'Team to remove the user from. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		displayOptions: {
			show: {
				resource: [
					'teamMember',
				],
				operation: [
					'remove',
				],
			},
		},
	},

	// ----------------------------------------
	//            teamMember: getAll
	// ----------------------------------------
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'teamMember',
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
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'teamMember',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'teamMember',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
