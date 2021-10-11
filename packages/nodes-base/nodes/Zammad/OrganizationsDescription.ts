import {
	INodeProperties,
} from 'n8n-workflow';

export const OrganizationsDescription = [
			// ----------------------------------
			//         Operation: organization
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['organization'],
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
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: organization
			// ----------------------------------
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The name of the organization.'
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
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The ID of the organization.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the organization.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Domain Assignment?',
						name: 'domain_assignment',
						type: 'boolean',
						default: false,
						description: "If the organizations domain assignment is active."
					},
					{
						displayName: 'Domain',
						name: 'domain',
						type: 'string',
						default: '',
						description: "The domain of the organization."
					},
					{
						displayName: 'Shared?',
						name: 'shared',
						type: 'boolean',
						default: false,
						description: "If the organization is shared."
					},
					{
						displayName: 'Active?',
						name: 'active',
						type: 'boolean',
						default: false,
						description: 'If the organization is active.'
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: "The note of the organization."
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
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The query to search the organizations.'
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'The limit of how many organizations to get.'
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['organization'],
						api: ['rest'],
					}
				},
				description: 'How to sort the organizations.'
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['organization'],
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
				description: 'How to order the organizations.'
			},
] as INodeProperties[];
