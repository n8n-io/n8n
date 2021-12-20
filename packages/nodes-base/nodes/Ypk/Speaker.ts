import {
	INodeProperties,
} from 'n8n-workflow';

export const speakerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'speaker',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an speaker',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an speaker',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an speaker',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all speakers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an speaker',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsSpeakers: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: `speaker's email`,
	},
	{
		displayName: 'Phone',
		name: 'phone_number',
		type: 'string',
		default: '',
		description: `speaker's phone`,
	},
	{
		displayName: 'Nationality',
		name: 'nationality',
		type: 'string',
		default: '',
		description: `speaker's nationality`,
	},
	{
		displayName: 'Gender',
		name: 'gender',
		type: 'collection',
		default: '',
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Femme',
						value: 'female',
					},
					{
						name: 'Homme',
						value: 'male',
					},
					{
						name: 'Autre',
						value: 'other',
					},
				],
				default: '',
			},
		],
		description: `speaker's gender`,
	},
	{
		displayName: 'Birthdate',
		name: 'birthdate',
		type: 'dateTime',
		default: '',
		description: `speaker's birthdate`,
	},
	{
		displayName: 'Birthplace',
		name: 'birthplace',
		type: 'string',
		default: '',
		description: `speaker's birthplace`,
	},
	{
		displayName: 'Address Street',
		name: 'street',
		type: 'string',
		default: '',
		description: `speaker's address street`,
	},
	{
		displayName: 'Address Additional',
		name: 'additional',
		type: 'string',
		default: '',
		description: `speaker's address additional`,
	},
	{
		displayName: 'Address ZIP Code',
		name: 'zip_code',
		type: 'string',
		default: '',
		description: `speaker's address ZIP Code`,
	},
	{
		displayName: 'Address City',
		name: 'city',
		type: 'string',
		default: '',
		description: `speaker's address City`,
	},
	{
		displayName: 'Address Country',
		name: 'country',
		type: 'string',
		default: '',
		description: `speaker's address City`,
	},
];

export const speakerFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Firstname',
		name: 'first_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'speaker',
				],
			},
		},
		description: 'speaker\'s firstname.',
	},
	{
		displayName: 'Lastname',
		name: 'last_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'speaker',
				],
			},
		},
		description: 'speaker\'s lastname.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'speaker',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsSpeakers,
		],
	},
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'speaker ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'speaker',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the speaker to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		description: 'The fields to update.',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'speaker',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Firstname',
				name: 'first_name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'speaker',
						],
					},
				},
				description: 'speaker\'s firstname.',
			},
			{
				displayName: 'Lastname',
				name: 'last_name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'speaker',
						],
					},
				},
				description: 'speaker\'s lastname.',
			},
			...additionalFieldsSpeakers,
		],
	},
	// ----------------------------------
	//         speaker:delete
	// ----------------------------------
	{
		displayName: 'speaker ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'speaker',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the speaker to delete.',
	},
	// ----------------------------------
	//         speaker:get
	// ----------------------------------
	{
		displayName: 'speaker ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'speaker',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the speaker to get.',
	},
	// ----------------------------------
	//         speaker:getAll
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'speaker',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search by firstname',
				name: 'search_by_firstname',
				type: 'string',
				default: '',
				description: 'Search by firstname',
			},
			{
				displayName: 'Search by lastname',
				name: 'search_by_lastname',
				type: 'string',
				default: '',
				description: 'Search by lastname',
			},
		],
	},
];
