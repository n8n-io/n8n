import {
	INodeProperties,
} from 'n8n-workflow';

export const onlineNotificationsDescription: INodeProperties[] = [
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
					'onlineNotification',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
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
				name: 'Mark All As Read',
				value: 'markAllAsRead',
				description: 'Mark all entries as read',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an entry',
			},
		],
		default: 'get',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Online Notification ID',
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
					'onlineNotification',
				],
				api: [
					'rest',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'onlineNotification',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		description: 'Additional optional fields of the online notification',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Object ID',
				name: 'o_id',
				type: 'number',
				default: 0,
				description: 'ID of the object',
			},
			{
				displayName: 'Object Lookup ID',
				name: 'object_lookup_id',
				type: 'number',
				default: 0,
				description: 'ID of the object lookup',
			},
			{
				displayName: 'Seen?',
				name: 'seen',
				type: 'boolean',
				default: false,
				description: 'Whether the online notification has been seen',
			},
			{
				displayName: 'Type Lookup ID',
				name: 'type_lookup_id',
				type: 'number',
				default: 0,
				description: 'ID of the type lookup',
			},
			{
				displayName: 'User ID',
				name: 'user_id',
				type: 'number',
				default: 0,
				description: 'ID of the user',
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
					'onlineNotification',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The query to search the online notifications',
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
					'onlineNotification',
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
					'onlineNotification',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'How to sort the online notifications',
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
					'onlineNotification',
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
		description: 'How to order the online notifications',
	},
];
