import type { INodeProperties } from 'n8n-workflow';

export const assignmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['assignment'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get assignment details',
				action: 'Get assignment details',
			},
			{
				name: 'Perform Action',
				value: 'performAction',
				description: 'Perform an action on an assignment',
				action: 'Perform action on assignment',
			},
		],
		default: 'get',
	},
];

export const assignmentFields: INodeProperties[] = [
	// ----------------------------------
	//         assignment:get
	// ----------------------------------
	{
		displayName: 'Assignment ID',
		name: 'assignmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the assignment to retrieve',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//         assignment:performAction
	// ----------------------------------
	{
		displayName: 'Assignment ID',
		name: 'assignmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the assignment to perform action on',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['performAction'],
			},
		},
	},
	{
		displayName: 'Action Name',
		name: 'actionName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., CollectClaimInfo',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['performAction'],
			},
		},
	},
	{
		displayName: 'If-Match',
		name: 'ifMatch',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., w/"2" or W/"3"',
		description:
			'The ETag value from a prior GET response (e.g. w/"2" or W/"3"). Automatically normalised for the If-Match header.',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['performAction'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'json',
		required: true,
		default: '{}',
		description: 'The content for the action as JSON',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['performAction'],
			},
		},
	},
	{
		displayName: 'Outcome',
		name: 'outcome',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'e.g., Submit',
		description: 'The outcome of the action (optional)',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['performAction'],
			},
		},
	},
];
