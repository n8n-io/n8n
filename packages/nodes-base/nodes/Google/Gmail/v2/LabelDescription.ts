import type { INodeProperties } from 'n8n-workflow';

export const labelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['label'],
			},
		},

		options: [
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
				name: 'Get',
				value: 'get',
				action: 'Get a label info',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many labels',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a label',
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
				resource: ['label'],
				operation: ['create'],
			},
		},
		placeholder: 'invoices',
		description:
			'Label name. To nest under another label, set Parent Label — do not include "/" in this field.',
	},
	{
		displayName: 'Parent Label Name or ID',
		name: 'parentLabelName',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUserLabels',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['create'],
			},
		},
		description:
			'Optional parent label name used to nest the new label as Parent/Name. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Label ID',
		name: 'labelId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['get', 'delete', 'update'],
			},
		},
		description: 'The ID of the label',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description:
					'New label name. Use "/" to nest (e.g. Work/Projects). Renaming a parent does not automatically rename child labels in Gmail.',
				placeholder: 'Work/Projects',
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
				description:
					'The visibility of messages with this label in the message list in the Gmail web interface',
			},
			{
				displayName: 'Text Color',
				name: 'textColor',
				type: 'color',
				default: '',
				description:
					'Label text color as a Gmail-allowed hex value (must be set together with Background Color)',
			},
			{
				displayName: 'Background Color',
				name: 'backgroundColor',
				type: 'color',
				default: '',
				description:
					'Label background color as a Gmail-allowed hex value (must be set together with Text Color)',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
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
				description:
					'The visibility of messages with this label in the message list in the Gmail web interface',
			},
			{
				displayName: 'Text Color',
				name: 'textColor',
				type: 'color',
				default: '',
				description:
					'Label text color as a Gmail-allowed hex value (must be set together with Background Color)',
			},
			{
				displayName: 'Background Color',
				name: 'backgroundColor',
				type: 'color',
				default: '',
				description:
					'Label background color as a Gmail-allowed hex value (must be set together with Text Color)',
			},
		],
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
				operation: ['getAll'],
				resource: ['label'],
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
				resource: ['label'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'getAllOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Simplify Hierarchy',
				name: 'simplifyHierarchy',
				type: 'boolean',
				default: false,
				description:
					'Whether to add leafName, parentName, and depth fields derived from nested label names',
			},
		],
	},
];
