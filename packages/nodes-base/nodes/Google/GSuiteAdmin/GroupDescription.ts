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
	/*                                 group                                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group',
		name: 'groupId',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group to perform the operation on',
		displayOptions: {
			show: {
				operation: ['delete', 'get', 'update'],
				resource: ['group'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchGroups',
				},
			},
			{
				displayName: 'By ID',
				name: 'GroupId',
				type: 'string',
				placeholder: 'e.g. 0123kx3o1habcdf',
			},
		],
		required: true,
		type: 'resourceLocator',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 group:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group Name',
		name: 'name',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['group'],
			},
		},
		default: '',
		description: "The group's display name",
		placeholder: 'e.g. Sales',
		type: 'string',
	},
	{
		displayName: 'Group Email',
		name: 'email',
		type: 'string',
		placeholder: 'e.g. sales@example.com',
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
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 group:delete                               */
	/* -------------------------------------------------------------------------- */

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
		displayName: 'Filter',
		name: 'filter',
		type: 'collection',
		placeholder: 'Add Filter',
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
				description: "The unique ID for the customer's Google Workspace account",
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain name. Use this field to get groups from a specific domain.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				placeholder: 'e.g. name:contact* email:contact*',
				default: '',
				description:
					'Query string to filter the results. Follow Google Admin SDK documentation. <a href="https://developers.google.com/admin-sdk/directory/v1/guides/search-groups#examples" target="_blank">More info</a>.',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Email or immutable ID of a user to list groups they are a member of',
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		placeholder: 'Add Sort Rule',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'sortRules',
				displayName: 'Sort Rules',
				values: [
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
						default: 'email',
						description: 'Field to sort the results by',
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
						default: 'ASCENDING',
						description: 'Sort order direction',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 group:update                               */
	/* -------------------------------------------------------------------------- */
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
				typeOptions: {
					rows: 2,
				},
				description:
					'An extended description to help users determine the purpose of a group. For example, you can include information about who should join the group, the types of messages to send to the group, links to FAQs about the group, or related groups.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'e.g. sales@example.com',
				default: '',
				description:
					"The group's email address. If your account has multiple domains, select the appropriate domain for the email address. The email must be unique.",
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				placeholder: 'e.g. Sales',
				default: '',
				description: "The group's display name",
			},
		],
	},
];
