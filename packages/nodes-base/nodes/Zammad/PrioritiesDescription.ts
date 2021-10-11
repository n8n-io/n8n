import {
	INodeProperties,
} from 'n8n-workflow';

export const PrioritiesDescription = [
			// ----------------------------------
			//         Operation: priority
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['priority'],
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
			//         Fields: priority
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
						resource: ['priority'],
						api: ['rest'],
					}
				},
				description: 'The name of the priority.'
			},
			{
				displayName: 'Priority ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'show', 'delete'],
						resource: ['priority'],
						api: ['rest'],
					}
				},
				description: 'The ID of the priority.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['priority'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the priority.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'UI Icon',
						name: 'ui_icon',
						type: 'string',
						default: '',
						description: "If ID of the next priority."
					},
					{
						displayName: 'UI Color',
						name: 'ui_color',
						type: 'string',
						default: '',
						description: "If escalation should be ignored."
					},
					{
						displayName: 'Active?',
						name: 'active',
						type: 'boolean',
						default: false,
						description: 'If the priority is active.'
					},
					{
						displayName: 'Default create?',
						name: 'default_create',
						type: 'boolean',
						default: false,
						description: "If priority is default for create."
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: "The note of the priority."
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
						resource: ['priority'],
						api: ['rest'],
					}
				},
				description: 'The query to search the priorities.'
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['priority'],
						api: ['rest'],
					}
				},
				description: 'The limit of how many priorities to get.'
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['priority'],
						api: ['rest'],
					}
				},
				description: 'How to sort the priorities.'
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['priority'],
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
				description: 'How to order the priorities.'
			},

] as INodeProperties[];
