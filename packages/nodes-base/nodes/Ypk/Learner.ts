import {
	INodeProperties,
} from 'n8n-workflow';

export const learnerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'learner',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an learner',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an learner',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an learner',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all learners',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an learner',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsLearners: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: `learner's email`,
	},
	{
		displayName: 'Phone',
		name: 'phone_number',
		type: 'string',
		default: '',
		description: `learner's phone`,
	},
	{
		displayName: 'Nationality',
		name: 'nationality',
		type: 'string',
		default: '',
		description: `learner's nationality`,
	},
	{
		displayName: 'Gender',
		name: 'gender',
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
		description: `learner's gender`,
	},
	{
		displayName: 'Birthdate',
		name: 'birthdate',
		type: 'dateTime',
		default: '',
		description: `learner's birthdate`,
	},
	{
		displayName: 'Birthplace',
		name: 'birthplace',
		type: 'string',
		default: '',
		description: `learner's birthplace`,
	},
	{
		displayName: 'Address Street',
		name: 'street',
		type: 'string',
		default: '',
		description: `learner's address street`,
	},
	{
		displayName: 'Address Additional',
		name: 'additional',
		type: 'string',
		default: '',
		description: `learner's address additional`,
	},
	{
		displayName: 'Address ZIP Code',
		name: 'zip_code',
		type: 'string',
		default: '',
		description: `learner's address ZIP Code`,
	},
	{
		displayName: 'Address City',
		name: 'city',
		type: 'string',
		default: '',
		description: `learner's address City`,
	},
	{
		displayName: 'Address Country',
		name: 'country',
		type: 'string',
		default: '',
		description: `learner's address City`,
	},
];

export const learnerFields: INodeProperties[] = [
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
					'learner',
				],
			},
		},
		description: 'learner\'s firstname.',
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
					'learner',
				],
			},
		},
		description: 'learner\'s lastname.',
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
					'learner',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsLearners,
		],
	},
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'learner ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'learner',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the learner to update.',
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
					'learner',
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
				description: 'learner\'s firstname.',
			},
			{
				displayName: 'Lastname',
				name: 'last_name',
				type: 'string',
				default: '',
				required: true,
				description: 'learner\'s lastname.',
			},
			...additionalFieldsLearners,
		],
	},
	// ----------------------------------
	//         learner:delete
	// ----------------------------------
	{
		displayName: 'learner ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'learner',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the learner to delete.',
	},
	// ----------------------------------
	//         learner:get
	// ----------------------------------
	{
		displayName: 'learner ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'learner',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the learner to get.',
	},
	// ----------------------------------
	//         learner:getAll
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
					'learner',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search by Lastname',
				name: 'search_lastname',
				type: 'string',
				default: '',
				description: 'Search by lastname',
			},
			{
				displayName: 'Search by Firstname',
				name: 'search_firstname',
				type: 'string',
				default: '',
				description: 'Search by Firstname',
			},
			{
				displayName: 'Search by Email',
				name: 'search_email',
				type: 'string',
				default: '',
				description: 'Search by Email',
			},
		],
	},
];
