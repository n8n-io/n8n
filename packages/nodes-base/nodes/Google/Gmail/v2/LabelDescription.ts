import {
	INodeProperties,
} from 'n8n-workflow';

export const labelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
			},
		},

		options: [
			{
				name: 'Add to Message (or Thread)',
				value: 'addLabels',
				action: 'Add to Message (or Thread)',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a label',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a label',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all labels',
			},
			{
				name: 'Get Label Info',
				value: 'get',
				action: 'Get a label info',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Remove from Message (or Thread)',
				value: 'removeLabels',
				action: 'Remove from Message (or Thread)',
			},
		],
		default: 'getAll',
	},
];

export const labelFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'create',
				],
			},
		},
		placeholder: 'invoices',
		description: 'Label Name',
	},
	{
		displayName: 'Label ID',
		name: 'labelId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'get',
					'delete',
				],
			},
		},
		description: 'The ID of the label',
	},
	{
		displayName: 'Label List Visibility',
		name: 'labelListVisibility',
		type: 'options',
		options: [
			{
				name: 'Hide',
				value: 'labelHide',
			},
			{
				name: 'Show',
				value: 'labelShow',
			},
			{
				name: 'Show If Unread',
				value: 'labelShowIfUnread',
			},
		],
		default: 'labelShow',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The visibility of the label in the label list in the Gmail web interface',
	},
	{
		displayName: 'Message List Visibility',
		name: 'messageListVisibility',
		type: 'options',
		options: [
			{
				name: 'Hide',
				value: 'hide',
			},
			{
				name: 'Show',
				value: 'show',
			},
		],
		default: 'show',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The visibility of messages with this label in the message list in the Gmail web interface',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 label:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'label',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'label',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                      label:addLabel, removeLabel                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Operate On',
		name: 'operateOn',
		type: 'options',
		default: 'threads',
		required: true,
		noDataExpression: true,
		options: [
			{
				name: 'Message',
				value: 'messages',
			},
			{
				name: 'Thread',
				value: 'threads',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'addLabels',
					'removeLabels',
				],
			},
		},
	},
	{
		displayName: 'Thread ID',
		name: 'resourceId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '172ce2c4a72cc243',
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'addLabels',
					'removeLabels',
				],
				operateOn: [
					'threads',
				],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'resourceId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '172ce2c4a72cc243',
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'addLabels',
					'removeLabels',
				],
				operateOn: [
					'messages',
				],
			},
		},
	},
	{
		displayName: 'Label ID Names or IDs',
		name: 'labelIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getLabels',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'addLabels',
					'removeLabels',
				],
			},
		},
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	},
];
