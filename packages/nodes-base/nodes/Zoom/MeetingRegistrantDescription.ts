import {
	INodeProperties,
} from 'n8n-workflow';
export const meetingRegistrantOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'meetingRegistrants',
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
				description: 'Update Meeting Registrant status',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all meeting registrants',
			},

		],
		default: 'create',
		description: 'The operation to perform.',
	}
] as INodeProperties[];



export const meetingRegistrantFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 meetingRegistrants:create                                */
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
					'meetingRegistrants',
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
					'meetingRegistrants',
				],
			},
		},
		description: 'Valid email-id of registrant.',
	},
	{
		displayName: 'First name',
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
					'meetingRegistrants',
				],
			},
		},
		description: 'First Name.',
	},
	{
		displayName: 'Additional settings',
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
					'meetingRegistrants',
				],
			}
		},
		options: [
			{
				displayName: 'Occurence Ids',
				name: 'occurenceId',
				type: 'string',
				default: '',
				description: 'Occurence IDs separated by comma.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last Name.',
			},
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
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'Valid state of registrant.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Valid country of registrant.',
			},
			{
				displayName: 'Zip code',
				name: 'zip',
				type: 'string',
				default: '',
				description: 'Valid zip-code of registrant.',
			},
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Valid phone number of registrant.',
			},
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				default: '',
				description: 'Allows registrants to provide any questions they have.',
			},
			{
				displayName: 'Organization',
				name: 'org',
				type: 'string',
				default: '',
				description: 'Organization of registrant.',
			},
			{
				displayName: 'Job title',
				name: 'job_title',
				type: 'string',
				default: '',
				description: 'Job title of registrant.',
			},
			{
				displayName: 'Purchasing time frame',
				name: 'purchasing_time_frame',
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
				description: 'Meeting type.'
			},
			{
				displayName: 'Role in purchase process',
				name: 'role_in_purchase_process',
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
				description: 'Role in purchase process.'
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meetingRegistrants:getAll                                */
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
					'getAll',
				],
				resource: [
					'meetingRegistrants',
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
					'meetingRegistrants',
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
					'meetingRegistrants',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 300
		},
		default: 30,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional settings',
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
					'meetingRegistrants',
				],
			}
		},
		options: [
			{
				displayName: 'Occurence Id',
				name: 'occurence_id',
				type: 'string',
				default: '',
				description: `Occurence Id.`,
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

		]
	},
	/* -------------------------------------------------------------------------- */
	/*                                 meetingRegistrants:update                                */
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
					'update',
				],
				resource: [
					'meetingRegistrants',
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
					'meetingRegistrants',
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
		displayName: 'Additional settings',
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
					'meetingRegistrants',
				],
			},
		},
		options: [
			{
				displayName: 'Occurence Id',
				name: 'occurenceId',
				type: 'string',
				default: '',
				description: 'Occurence ID.',
			},

		],
	}

] as INodeProperties[];
