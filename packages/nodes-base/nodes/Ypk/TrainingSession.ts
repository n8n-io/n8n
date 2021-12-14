import {
	INodeProperties
} from 'n8n-workflow';

export const trainingSessionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'trainingSession',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an trainingSession',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an trainingSession',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an trainingSession',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all trainingSessions',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an trainingSession',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsTrainingSessions: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'trainingSession\'s firstname.',
	},
	{
		displayName: 'Code interne',
		name: 'code',
		type: 'string',
		default: '',
		description: `trainingSession's code`,
	},
	{
		displayName: 'Training Id',
		name: 'training_id',
		type: 'string',
		default: '',
		description: `trainingSession's training id`,
	},
	{
		displayName: 'Price',
		name: 'price',
		type: 'number',
		default: 0,
		description: `trainingSession's training price`,
	},
	{
		displayName: 'TVA',
		name: 'vat',
		type: 'number',
		default: 0,
		description: `trainingSession's vat`,
	},
	{
		displayName: 'Start Date',
		name: 'start_date',
		type: 'string',
		default: '',
		description: `trainingSession's Start Date`,
	},
	{
		displayName: 'End Date',
		name: 'end_date',
		type: 'string',
		default: '',
		description: `trainingSession's End Date`,
	},
	{
		displayName: 'Duration (hours)',
		name: 'duration',
		type: 'number',
		default: 0,
		description: `trainingSession's Duration`,
	},
	{
		displayName: 'Duration (days)',
		name: 'duration_day',
		type: 'number',
		default: 0,
		description: `trainingSession's Duration Day`,
	},
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		default: 0,
		description: `trainingSession's days`,
	},
	{
		displayName: 'Number min',
		name: 'number_min',
		type: 'number',
		default: 0,
		description: `trainingSession's number min`,
	},
	{
		displayName: 'Number max',
		name: 'number_max',
		type: 'number',
		default: 0,
		description: `trainingSession's number max`,
	},
	{
		displayName: 'Format',
		name: 'session_location_id',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSessionLocationsOptions',
		},
		default: '',
		description: `trainingSession's session_location_id`,
	},
	{
		displayName: 'Mode',
		name: 'training_type_id',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLearningModesOptions',
		},
		default: '',
		description: `trainingSession's type`,
	},
	{
		displayName: 'Referent ID',
		name: 'speaker_id',
		type: 'string',
		default: '',
		description: `trainingSession's head teacher`,
	},
];

export const trainingSessionFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
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
					'trainingSession',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsTrainingSessions,
		],
	},
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'trainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'trainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the trainingSession to update.',
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
					'trainingSession',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsTrainingSessions,
		],
	},
	// ----------------------------------
	//         trainingSession:delete
	// ----------------------------------
	{
		displayName: 'trainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'trainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the trainingSession to delete.',
	},
	// ----------------------------------
	//         trainingSession:get
	// ----------------------------------
	{
		displayName: 'trainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'trainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the trainingSession to get.',
	},
	// ----------------------------------
	//         trainingSession:getAll
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
					'trainingSession',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search by name',
			},
		],
	},
];
