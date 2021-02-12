import {
	INodeProperties,
} from 'n8n-workflow';

export const attendeeOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Get Details',
				value: 'getDetails',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
			},
		},
	},
] as INodeProperties[];

export const attendeeFields = [
	// ----------------------------------
	//     attendee: shared fields
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: {},
		description: '',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
			},
		},
	},
	{
		displayName: 'Session Key',
		name: 'sessionKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
			},
		},
	},
	// ----------------------------------
	//          attendee: get
	// ----------------------------------
	{
		displayName: 'Registrant Key',
		name: 'registrantKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
				operation: [
					'get',
				],
			},
		},
	},
	// ----------------------------------
	//       attendee: getDetails
	// ----------------------------------
	{
		displayName: 'Details',
		name: 'details',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
				operation: [
					'getDetails',
				],
			},
		},
	},

	// ----------------------------------
	//         attendee: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
