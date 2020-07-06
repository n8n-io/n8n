import { INodeProperties } from 'n8n-workflow';

export const releaseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get release by version identifier.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all releases.',
            },
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const releaseFields = [
/* -------------------------------------------------------------------------- */
/*                                release:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the releases belong to.',
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
					'release',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'This parameter can be used to create a “starts with” filter for the version.',
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                release:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the release belongs to.',
	},
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The version identifier of the release.',
	},
] as INodeProperties[];
