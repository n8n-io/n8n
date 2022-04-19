import {
	INodeProperties,
} from 'n8n-workflow';

export const meetingRegistrantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'meetingRegistrant',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create Meeting Registrants',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update Meeting Registrant Status',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all Meeting Registrants',
			},

		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const meetingRegistrantFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 meetingRegistrant:create                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Meeting Id',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		description: 'Meeting ID.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		description: 'Valid Email-ID.',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		description: 'First Name.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',

				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Valid address of registrant.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'Valid city of registrant.',
			},
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				default: '',
				description: 'Allows registrants to provide any questions they have.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Valid country of registrant.',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'Job title of registrant.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last Name.',
			},
			{
				displayName: 'Occurrence IDs',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Occurrence IDs separated by comma.',
			},
			{
				displayName: 'Organization',
				name: 'org',
				type: 'string',
				default: '',
				description: 'Organization of registrant.',
			},
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Valid phone number of registrant.',
			},
			{
				displayName: 'Purchasing Time Frame',
				name: 'purchasingTimeFrame',
				type: 'options',
				options: [
					{
						name: 'Within a month',
						value: 'Within a month',
					},
					{
						name: '1-3 months',
						value: '1-3 months',
					},
					{
						name: '4-6 months',
						value: '4-6 months',
					},
					{
						name: 'More than 6 months',
						value: 'More than 6 months',
					},
					{
						name: 'No timeframe',
						value: 'No timeframe',
					},
				],
				default: '',
				description: 'Meeting type.',
			},
			{
				displayName: 'Role in Purchase Process',
				name: 'roleInPurchaseProcess',
				type: 'options',
				options: [
					{
						name: 'Decision Maker',
						value: 'Decision Maker',
					},
					{
						name: 'Evaluator/Recommender',
						value: 'Evaluator/Recommender',
					},
					{
						name: 'Influener',
						value: 'Influener',
					},
					{
						name: 'Not Involved',
						value: 'Not Involved',
					},

				],
				default: '',
				description: 'Role in purchase process.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'Valid state of registrant.',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
				description: 'Valid zip-code of registrant.',
			},

		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meetingRegistrant:getAll                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		description: 'Meeting ID.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'meetingRegistrant',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',

				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: `Occurrence ID.`,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Approved',
						value: 'approved',
					},
					{
						name: 'Denied',
						value: 'denied',
					},
				],
				default: 'approved',
				description: `Registrant Status.`,
			},

		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meetingRegistrant:update                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		description: 'Meeting ID.',
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
			},
			{
				name: 'Approved',
				value: 'approve',
			},
			{
				name: 'Deny',
				value: 'deny',
			},
		],
		default: '',
		description: `Registrant Status.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'meetingRegistrant',
				],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Occurrence ID.',
			},

		],
	},

];
