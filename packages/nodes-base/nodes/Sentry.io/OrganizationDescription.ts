import { INodeProperties } from 'n8n-workflow';

export const organizationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an organization.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get organization by ID.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all organizations.',
			}
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const organizationFields = [
/* -------------------------------------------------------------------------- */
/*                                organization:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Member',
				name: 'member',
				type: 'boolean',
				default: true,
				description: 'Restrict results to organizations which you have membership.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'boolean',
				default: true,
				description: 'Restrict results to organizations which you are the owner.',
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                organization:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the team should be created for.',
	},
/* -------------------------------------------------------------------------- */
/*                                organization:create                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the team should be created for.',
	},
	{
		displayName: 'Agree to Terms',
		name: 'agreeTerms',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Signaling you agree to the applicable terms of service and privacy policy of Sentry.io.',
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
					'organization',
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
				description: 'The unique URL slug for this organization. If this is not provided a slug is automatically generated based on the name.',
			},
		]
	},
] as INodeProperties[];
