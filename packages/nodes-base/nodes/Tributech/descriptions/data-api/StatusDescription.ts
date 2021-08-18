import {
	INodeProperties,
} from 'n8n-workflow';

export const statusOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'status',
				],
			},
		},
		options: [
			{
				name: 'Get Request Status',
				value: 'getRequestStatus',
			},
			{
				name: 'Get Stream Status',
				value: 'getStreamStatus',
			},
			{
				name: 'Get Subscription Status',
				value: 'getSubscriptionStatus',
			},
		],
		default: 'getRequestStatus',
	},
] as INodeProperties[];

export const statusFields = [
	{
		displayName: 'Request ID',
		name: 'requestId',
		description: 'The request id.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'status',
				],
				operation: [
					'getRequestStatus',
					'getStreamStatus',
					'getSubscriptionStatus',
				],
			},
		},
	},

	{
		displayName: 'valueMetadata ID',
		name: 'valueMetadataId',
		description: 'The ValueMedataId of the data stream.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'status',
				],
				operation: [
					'getStreamStatus',
				],
			},
		},
	},
] as INodeProperties[];
