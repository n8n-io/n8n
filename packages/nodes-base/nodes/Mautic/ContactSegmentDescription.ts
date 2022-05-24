import {
	INodeProperties,
} from 'n8n-workflow';

export const contactSegmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contactSegment',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to a segment',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove contact from a segment',
			},
		],
		default: 'add',
	},
];

export const contactSegmentFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                               contactSegment:add                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactSegment',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		default: '',
	},
	{

		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactSegment',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSegments',
		},
		default: '',

	},
];
