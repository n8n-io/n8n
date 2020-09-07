import {
	INodeProperties,
} from 'n8n-workflow';

export const projectOperations = [
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
				name: 'Get',
				value: 'get',
				description: 'Get project by ID',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all projects',
			}
		],
		default: 'get',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const projectFields = [
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
					'update',
					'delete',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the events belong to',
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
		description: 'The slug of the project to retrieve',
	},
	{
		displayName: 'Team Slug',
		name: 'teamSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
				operation: [
					'create',
					'update',
					'delete',
				],
			},
		},
		required: true,
		description: 'The slug of the team to create a new project for',
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
		description: 'The name for the new project',
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
				description: 'Optionally a slug for the new project. If it’s not provided a slug is generated from the name',
			},
		]
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
		description: 'If all results should be returned or only up to a given limit',
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
		description: 'How many results to return',
	},
] as INodeProperties[];
