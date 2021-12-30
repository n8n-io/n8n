import {
	INodeProperties,
} from 'n8n-workflow';

export const usersDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all entries',
			},
			{
				name: 'Me',
				value: 'me',
				description: 'Get data of the current user',
			},
			{
				name: 'Search',
				value: 'search', // TODO combine with get
				description: 'Get data of an entry',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an entry',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Email Address',
		name: 'emailAddress',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'user',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The email address of the user',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
					'get',
					'delete',
				],
				resource: [
					'user',
				],
			},
		},
		description: 'The ID of the user',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create', 'update',
				],
				resource: [
					'user',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		description: 'Additional optional fields of the user',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active?',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Whether the user is active',
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the user',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City of the users address',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the users address',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description: 'Department of the user',
			},
			{
				displayName: 'Fax Number',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'Fax number of the user',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
				description: 'The first name of the user',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
				description: 'The last name of the user',
			},
			{
				displayName: 'Login',
				name: 'login',
				type: 'string',
				default: '',
				description: 'The login name of the user',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the user',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'The note of the user',
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
				description: 'The organization of the user',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the user',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				description: 'Street of the users address',
			},
			{
				displayName: 'Verified?',
				name: 'verified',
				type: 'boolean',
				default: false,
				description: 'Whether the user is verified',
			},
			{
				displayName: 'VIP?',
				name: 'vip',
				type: 'boolean',
				default: false,
				description: 'Whether the user is VIP',
			},
			{
				displayName: 'Website',
				name: 'web',
				type: 'string',
				default: '',
				description: 'Website of the user',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
				description: 'Zip Code of the users address',
			},
		],
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'user',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The query to search the users',
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
				operation: [
					'search',
				],
				resource: [
					'user',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Sort By',
		name: 'sort_by',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'user',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'How to sort the users',
	},
	{
		displayName: 'Order By',
		name: 'order_by',
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'user',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Ascending',
				value: 'asc',
			},
			{
				name: 'Descending',
				value: 'desc',
			},
		],
		default: 'asc',
		description: 'How to order the users',
	},
];
