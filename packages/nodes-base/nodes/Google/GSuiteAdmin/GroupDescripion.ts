import type { INodeProperties } from 'n8n-workflow';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a group',
				action: 'Create a group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a group',
				action: 'Delete a group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a group',
				action: 'Get a group',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many groups',
				action: 'Get many groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a group',
				action: 'Update a group',
			},
		],
		default: 'create',
	},
];

export const groupFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 group:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['group'],
			},
		},
		default: '',
		description:
			"The group's email address. If your account has multiple domains, select the appropriate domain for the email address. The email must be unique",
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['group'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description:
					'An extended description to help users determine the purpose of a group. For example, you can include information about who should join the group, the types of messages to send to the group, links to FAQs about the group, or related groups.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: "The group's display name",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 group:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['group'],
			},
		},
		default: '',
		description:
			"Identifies the group in the API request. The value can be the group's email address, group alias, or the unique group ID.",
	},
	/* -------------------------------------------------------------------------- */
	/*                                 group:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['group'],
			},
		},
		default: '',
		description:
			"Identifies the group in the API request. The value can be the group's email address, group alias, or the unique group ID.",
	},
	/* -------------------------------------------------------------------------- */
	/*                                 group:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['group'],
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
				operation: ['getAll'],
				resource: ['group'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['group'],
			},
		},
		options: [
			{
				displayName: 'Customer',
				name: 'customer',
				type: 'string',
				default: '',
				description:
					"The unique ID for the customer's Google Workspace account. In case of a multi-domain account, to fetch all groups for a customer, fill this field instead of domain.",
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain name. Use this field to get fields from only one domain.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
				],
				default: '',
				description: 'Property to use for sorting results',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description:
					'Query string search. Complete documentation is <a href="https://developers.google.com/admin-sdk/directory/v1/guides/search-groups">at</a>.',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: '',
				description: 'Whether to return results in ascending or descending order',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description:
					"Email or immutable ID of the user if only those groups are to be listed, the given user is a member of. If it's an ID, it should match with the ID of the user object.",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 group:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['group'],
			},
		},
		default: '',
		description:
			"Identifies the group in the API request. The value can be the group's email address, group alias, or the unique group ID.",
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['group'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description:
					'An extended description to help users determine the purpose of a group. For example, you can include information about who should join the group, the types of messages to send to the group, links to FAQs about the group, or related groups.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description:
					"The group's email address. If your account has multiple domains, select the appropriate domain for the email address. The email must be unique.",
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: "The group's display name",
			},
		],
	},
];
