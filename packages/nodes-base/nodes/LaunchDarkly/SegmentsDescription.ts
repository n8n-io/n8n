import { INodeProperties } from 'n8n-workflow';

const instructionsKinds = [
	'addIncludedUsers',
	'addExcludedUsers',
	'removeIncludedUsers',
	'removeExcludedUsers',
	'updateName',
];

export const segmentsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'segments',
				],
			},
		},
		options: [
			{
				name: 'Patch Segment',
				value: 'patchSegment',
				description: 'Update a user segment',
				action: 'Patch Segment a segments',
			},
		],
		default: '',
	},
];

export const segmentsFields: INodeProperties[] = [
	{
		displayName: 'Project Key Name or ID',
		name: 'projectKey',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				operation: [
					'patchSegment',
				],
				resource: [
					'segments',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Environment Key Name or ID',
		name: 'environmentKey',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: [
				'projectKey',
			],
			loadOptionsMethod: 'getEnvironments',
		},
		displayOptions: {
			show: {
				operation: [
					'patchSegment',
				],
				resource: [
					'segments',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Segment Key Name or ID',
		name: 'segmentKey',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: [
				'projectKey',
				'environmentKey',
			],
			loadOptionsMethod: 'getSegments',
		},
		displayOptions: {
			show: {
				operation: [
					'patchSegment',
				],
				resource: [
					'segments',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Instruction Kind',
		name: 'kind',
		type: 'options',
		options: instructionsKinds.map(kind => ({name: kind, value: kind})),
		displayOptions: {
			show: {
				operation: [
					'patchSegment',
				],
				resource: [
					'segments',
				],
			},
		},
		default: '',
		required: true,
		description: 'Semantic patch requests support the following kind instructions for updating segments',
	},
	{
		displayName: 'Values',
		name: 'values',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'patchSegment',
				],
				resource: [
					'segments',
				],
			},
		},
		default: '',
		required: true,
		description: 'List of user keys',
	},
];
