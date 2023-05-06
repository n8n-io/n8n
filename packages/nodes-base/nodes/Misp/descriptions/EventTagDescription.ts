import type { INodeProperties } from 'n8n-workflow';

export const eventTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['eventTag'],
			},
		},
		noDataExpression: true,
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add a tag to an event',
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove a tag from an event',
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
				resource: ['eventTag'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		displayOptions: {
			show: {
				resource: ['eventTag'],
				operation: ['add'],
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
				resource: ['eventTag'],
				operation: ['remove'],
			},
		},
	},
	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		displayOptions: {
			show: {
				resource: ['eventTag'],
				operation: ['remove'],
			},
		},
	},
];
