import {
	INodeProperties,
} from 'n8n-workflow';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new project',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get project by ID',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all projects',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a project',
			},
		],
		default: 'get',
		description: 'The operation to perform',
	},
];

export const projectFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                project:create/get                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'create',
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the events belong to.',
	},
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
			loadOptionsDependsOn: [
				'organizationSlug',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the project to retrieve.',
	},
	{
		displayName: 'Team Slug',
		name: 'teamSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
			loadOptionsDependsOn: [
				'organizationSlug',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The slug of the team to create a new project for.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The name for the new project.',
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
					'project',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Optionally a slug for the new project. If it’s not provided a slug is generated from the name.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:getAll                              */
	/* -------------------------------------------------------------------------- */
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
					'project',
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
					'project',
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

	/* -------------------------------------------------------------------------- */
	/*                                project:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the project belong to.',
	},
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
			loadOptionsDependsOn: [
				'organizationSlug',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'The slug of the project to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Bookmarked',
				name: 'isBookmarked',
				type: 'boolean',
				default: false,
				description: 'The new platform for the updated project.',
			},
			{
				displayName: 'Digests Maximum Delay',
				name: 'digestsMaxDelay',
				type: 'number',
				default: 1800,
				description: 'Maximum interval to digest alerts.',
			},
			{
				displayName: 'Digests Minimun Delay',
				name: 'digestsMinDelay',
				type: 'number',
				default: 60,
				description: 'Minium interval to digest alerts.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name for the updated project.',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'The new slug for the updated project.',
			},
			{
				displayName: 'Team',
				name: 'team',
				type: 'string',
				default: '',
				description: 'The new team name.',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'string',
				default: '',
				description: 'The new platform for the updated project.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the project belong to.',
	},
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
			loadOptionsDependsOn: [
				'organizationSlug',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
		description: 'The slug of the project to delete.',
	},
];
