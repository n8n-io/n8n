import {
	INodeProperties,
} from 'n8n-workflow';

export const eventTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'eventTag',
				],
			},
		},
		noDataExpression: true,
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Remove',
				value: 'remove',
			},
		],
		default: 'add',
	},
];

export const eventTagFields: INodeProperties[] = [
	// ----------------------------------------
	//             eventTag: add
	// ----------------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'UUID or numeric ID of the event',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'eventTag',
				],
				operation: [
					'add',
				],
			},
		},
	},
	{
		displayName: 'Tag Name/ID',
		name: 'tagId',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		displayOptions: {
			show: {
				resource: [
					'eventTag',
				],
				operation: [
					'add',
				],
			},
		},
	},

	// ----------------------------------------
	//            eventTag: remove
	// ----------------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		description: 'UUID or numeric ID of the event',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'eventTag',
				],
				operation: [
					'remove',
				],
			},
		},
	},
	{
		displayName: 'Tag Name/ID',
		name: 'tagId',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		displayOptions: {
			show: {
				resource: [
					'eventTag',
				],
				operation: [
					'remove',
				],
			},
		},
	},
];
