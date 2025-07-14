import type { INodeProperties } from 'n8n-workflow';

export const meetingRegistrantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['meetingRegistrant'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create Meeting Registrants',
				action: 'Create a meeting registrant',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update Meeting Registrant Status',
				action: 'Update a meeting registrant',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many Meeting Registrants',
				action: 'Get many meeting registrants',
			},
		],
		default: 'create',
	},
];

export const meetingRegistrantFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 meetingRegistrant:create                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['meetingRegistrant'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['meetingRegistrant'],
			},
		},
		description: 'Valid Email-ID',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['meetingRegistrant'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['meetingRegistrant'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Valid address of registrant',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'Valid city of registrant',
			},
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				default: '',
				description: 'Allows registrants to provide any questions they have',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Valid country of registrant',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'Job title of registrant',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Occurrence IDs',
				name: 'occurrenceId',
				type: 'string',
				default: '',
				description: 'Occurrence IDs separated by comma',
			},
			{
				displayName: 'Organization',
				name: 'org',
				type: 'string',
				default: '',
				description: 'Organization of registrant',
			},
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Valid phone number of registrant',
			},
			{
				displayName: 'Purchasing Time Frame',
				name: 'purchasingTimeFrame',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Within a Month',
						value: 'Within a month',
					},
					{
						name: '1-3 Months',
						value: '1-3 months',
					},
					{
						name: '4-6 Months',
						value: '4-6 months',
					},
					{
						name: 'More than 6 Months',
						value: 'More than 6 months',
					},
					{
						name: 'No Timeframe',
						value: 'No timeframe',
					},
				],
				default: '',
				description: 'Meeting type',
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
						name: 'Influencer',
						value: 'Influencer',
					},
					{
						name: 'Not Involved',
						value: 'Not Involved',
					},
				],
				default: '',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'Valid state of registrant',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
				description: 'Valid zip-code of registrant',
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
				operation: ['getAll'],
				resource: ['meetingRegistrant'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['meetingRegistrant'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['meetingRegistrant'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		default: 30,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['meetingRegistrant'],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
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
				description: 'Registrant Status',
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
				operation: ['update'],
				resource: ['meetingRegistrant'],
			},
		},
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['meetingRegistrant'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a meeting registrant',
			},
			{
				name: 'Approved',
				value: 'approve',
				action: 'Approved a meeting registrant',
			},
			{
				name: 'Deny',
				value: 'deny',
				action: 'Deny a meeting registrant',
			},
		],
		default: '',
		description: 'Registrant Status',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['meetingRegistrant'],
			},
		},
		options: [
			{
				displayName: 'Occurrence ID',
				name: 'occurrenceId',
				type: 'string',
				default: '',
			},
		],
	},
];
