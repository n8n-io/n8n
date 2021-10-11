import {
	INodeProperties,
} from 'n8n-workflow';

export const UsersDescription = [
			// ----------------------------------
			//         Operation: user
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['user'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry.'
					},
					{
						name: 'Show',
						value: 'show',
						description: 'Get data of an entry.'
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Get data of an entry.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'Get data of all entries.'
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an entry.'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry.'
					},
					{
						name: 'Me',
						value: 'me',
						description: 'Get data of the current user.'
					},
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: User
			// ----------------------------------
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'The email address of the user.'
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'show', 'delete'],
						resource: ['user']
					}
				},
				description: 'The ID of the user.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the user.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Login',
						name: 'login',
						type: 'string',
						default: '',
						description: "The login name of the user."
					},
					{
						displayName: 'First Name',
						name: 'firstname',
						type: 'string',
						default: '',
						description: "The user's first name."
					},
					{
						displayName: 'Last Name',
						name: 'lastname',
						type: 'string',
						default: '',
						description: 'The last name of the user.'
					},
					{
						displayName: 'Organization',
						name: 'organization',
						type: 'string',
						default: '',
						description: 'The organization of the user.'
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: "The note of the user."
					},
					{
						displayName: 'Website',
						name: 'web',
						type: 'string',
						default: '',
						description: "Website of the user."
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: "Phone number of the user."
					},
					{
						displayName: 'Mobile Phone',
						name: 'mobile',
						type: 'string',
						default: '',
						description: "Mobile phone number of the user."
					},
					{
						displayName: 'Fax number',
						name: 'fax',
						type: 'string',
						default: '',
						description: "Fax number of the user."
					},
					{
						displayName: 'Department',
						name: 'department',
						type: 'string',
						default: '',
						description: "Department of the user."
					},
					{
						displayName: 'Street',
						name: 'street',
						type: 'string',
						default: '',
						description: "Street of the users address."
					},
					{
						displayName: 'Zip Code',
						name: 'zip',
						type: 'string',
						default: '',
						description: "Zip Code of the users address."
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: "City of the users address."
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						description: "Country of the users address."
					},
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						description: "Address of the user."
					},
					{
						displayName: 'VIP?',
						name: 'vip',
						type: 'boolean',
						default: false,
						description: "Is the user vip?"
					},
					{
						displayName: 'Verified?',
						name: 'verified',
						type: 'boolean',
						default: false,
						description: "Is the user verified?"
					},
					{
						displayName: 'Active?',
						name: 'active',
						type: 'boolean',
						default: false,
						description: "Is the user active?"
					},
				]
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'The query to search the users.'
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'The limit of how many users to get.'
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				description: 'How to sort the users.'
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['user'],
						api: ['rest'],
					}
				},
				options: [
					{
						name: 'Ascending',
						value: 'asc'
					},
					{
						name: 'Descending',
						value: 'desc'
					},
				],
				default: [],
				description: 'How to order the users.'
			},
] as INodeProperties[];
