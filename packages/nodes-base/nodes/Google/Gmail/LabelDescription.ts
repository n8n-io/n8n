import {
	INodeProperties,
} from 'n8n-workflow';

export const labelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'label',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new label',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a label',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a label',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all labels',
			},
		],
		default: 'create',
		description: 'The operation to perform',
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
		description: 'The visibility of the label in the label list in the Gmail web interface.',
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
				name: 'show',
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
		description: 'The visibility of messages with this label in the message list in the Gmail web interface.',
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
		description: 'If all results should be returned or only up to a given limit.',
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
		default: 100,
		description: 'How many results to return.',
	},
];
