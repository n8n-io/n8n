import {
	INodeProperties,
} from 'n8n-workflow';

export const segmentEmailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'segmentEmail',
				],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send an email to a segment',
			},
		],
		default: 'send',
	},
];

export const segmentEmailFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                               segmentEmail:send                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Segment Email Name or ID',
		name: 'segmentEmailId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'segmentEmail',
				],
				operation: [
					'send',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSegmentEmails',
		},
		default: '',
	},
];
