import {
	INodeProperties,
} from 'n8n-workflow';

export const OnlineNotificationsDescription = [
			// ----------------------------------
			//         Operation:  online notification
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['onlineNotification'],
						api: ['rest']
					}
				},
				options: [
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
					{
						name: 'Mark All As Read',
						value: 'markAllAsRead',
						description: 'Mark all entries as read.'
					},
				],
				default: 'show',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: online notification
			// ----------------------------------
			{
				displayName: 'Online Notification ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'show', 'delete'],
						resource: ['onlineNotification'],
						api: ['rest'],
					}
				},
				description: 'The ID of the  online notification.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['onlineNotification'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the  online notification.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Seen?',
						name: 'seen',
						type: 'boolean',
						default: false,
						description: "Seen status of the online notification."
					},
					{
						displayName: 'Object ID',
						name: 'o_id',
						type: 'number',
						default: 0,
						description: "ID of the object."
					},
					{
						displayName: 'Object Lookup ID',
						name: 'object_lookup_id',
						type: 'number',
						default: 0,
						description: "ID of the object lookup."
					},
					{
						displayName: 'Type Lookup ID',
						name: 'type_lookup_id',
						type: 'number',
						default: 0,
						description: "ID of the type lookup."
					},
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'number',
						default: 0,
						description: "ID of the user."
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
						resource: ['onlineNotification'],
						api: ['rest'],
					}
				},
				description: 'The query to search the  online notifications.'
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['onlineNotification'],
						api: ['rest'],
					}
				},
				description: 'The limit of how many  online notifications to get.'
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['onlineNotification'],
						api: ['rest'],
					}
				},
				description: 'How to sort the  online notifications.'
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['onlineNotification'],
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
				description: 'How to order the  online notifications.'
			},

] as INodeProperties[];
