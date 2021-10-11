import {
	INodeProperties,
} from 'n8n-workflow';

export const TicketsDescription = [
			// ----------------------------------
			//         Operation: ticket
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['ticket'],
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
			//         Fields: ticket
			// ----------------------------------
			{
				displayName: 'Group',
				name: 'group',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['ticket'],
						api: ['rest'],
					}
				},
				description: 'The group of the ticket.'
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
						resource: ['ticket'],
						api: ['rest'],
					}
				},
				description: 'The ID of the ticket.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['ticket'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the ticket.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Domain Assignment?',
						name: 'domain_assignment',
						type: 'boolean',
						default: false,
						description: "If the tickets domain assignment is active."
					},
					{
						displayName: 'Domain',
						name: 'domain',
						type: 'string',
						default: '',
						description: "The domain of the ticket."
					},
					{
						displayName: 'Shared?',
						name: 'shared',
						type: 'boolean',
						default: false,
						description: "If the ticket is shared."
					},
					{
						displayName: 'Active?',
						name: 'active',
						type: 'boolean',
						default: false,
						description: 'If the ticket is active.'
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: "The note of the ticket."
					},
				]
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				placeholder: 'Add Custom Field',
				description: 'Adds a custom field to set the value of.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true
				},
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['ticket'],
						api: ['rest']
					}
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the field to set.'
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set.'
							}
						]
					}
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
						resource: ['ticket'],
						api: ['rest'],
					}
				},
				description: 'The query to search the tickets.'
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['ticket'],
						api: ['rest'],
					}
				},
				description: 'The limit of how many tickets to get.'
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['ticket'],
						api: ['rest'],
					}
				},
				description: 'How to sort the tickets.'
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['ticket'],
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
				description: 'How to order the tickets.'
			},
] as INodeProperties[];
