import {
	INodeProperties,
} from 'n8n-workflow';

export const teamOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'team',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new team',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get team by slug',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all teams',
			}
		],
		default: 'get',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const teamFields = [
/* -------------------------------------------------------------------------- */
/*                                team:getAll                                 */
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
					'team',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the organization for which the teams should be listed',
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
					'team',
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
					'team',
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
/* -------------------------------------------------------------------------- */
/*                                team:get                                   */
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
					'team',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the team belongs to',
	},
	{
		displayName: 'Team Slug',
		name: 'teamSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'team',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the team to get',
	},
/* -------------------------------------------------------------------------- */
/*                                team:create                                 */
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
					'team',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the team belongs to',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'team',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The name of the team',
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
					'team',
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
				description: 'The optional slug for this team. If not provided it will be auto generated from the name',
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                team:update                                 */
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
					'team',
				],
				operation: [
					'update', 'delete'
				],
			},
		},
		required: true,
		description: 'The slug of the organization the team belongs to',
	},
	{
		displayName: 'Team Slug',
		name: 'teamSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'team',
				],
				operation: [
					'update', 'delete'
				],
			},
		},
		required: true,
		description: 'The slug of the team to get',
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
					'team',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'The new slug of the team. Must be unique and available',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name of the team',
			},
		]
	},
] as INodeProperties[];
