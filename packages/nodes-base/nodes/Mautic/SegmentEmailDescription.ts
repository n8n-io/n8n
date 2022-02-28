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
		displayName: 'Segment Email ID',
		name: 'segmentEmailId',
		type: 'options',
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
