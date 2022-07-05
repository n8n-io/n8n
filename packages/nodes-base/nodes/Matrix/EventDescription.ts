import {
	INodeProperties,
} from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get single event by ID',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];


export const eventFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 event:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'string',
		default: '',
		placeholder: '!123abc:matrix.org',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'event',
				],
			},
		},
		required: true,
		description: 'The room related to the event',
	},
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		default: '',
		placeholder: '$1234abcd:matrix.org',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'event',
				],
			},
		},
		required: true,
		description: 'The room related to the event',
	},
];
