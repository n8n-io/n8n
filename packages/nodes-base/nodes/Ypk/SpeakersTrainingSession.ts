import {
	INodeProperties
} from 'n8n-workflow';

export const speakersTrainingSessionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'speakersTrainingSession',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an speakersTrainingSession',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an speakersTrainingSession',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an speakersTrainingSession',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all speakersTrainingSessions of a session',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an speakersTrainingSession',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsSpeakersTrainingSessions: INodeProperties[] = [
	{
		displayName: 'Statut',
		name: 'speaker_status_id',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpeakerStatusesOptions',
		},
		default: '',
		description: `speakersTrainingSession's Statut`,
	},
	{
		displayName: 'Tarif jour',
		name: 'daily_rate',
		type: 'number',
		default: '',
		description: `speakersTrainingSession's daily rate`,
	},
	{
		displayName: 'Tarif heure',
		name: 'hourly_rate',
		type: 'number',
		default: '',
		description: `speakersTrainingSession's hourly rate`,
	},
	{
		displayName: 'Hours',
		name: 'hours',
		type: 'number',
		default: '',
		description: `speakersTrainingSession's hours`,
	},
];

export const speakersTrainingSessionFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Session ID',
		name: 'training_session_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'speakersTrainingSession',
				],
			},
		},
		description: `speakersTrainingSession's training_session_id`,
	},
	{
		displayName: 'Speaker Id',
		name: 'speaker_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'speakersTrainingSession',
				],
			},
		},
		description: `speakersTrainingSession's training id`,
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
					'speakersTrainingSession',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsSpeakersTrainingSessions,
		],
	},
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'speakersTrainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'speakersTrainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the speakersTrainingSession to update.',
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
					'speakersTrainingSession',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsSpeakersTrainingSessions,
		],
	},
	// ----------------------------------
	//         speakersTrainingSession:delete
	// ----------------------------------
	{
		displayName: 'speakersTrainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'speakersTrainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the speakersTrainingSession to delete.',
	},
	// ----------------------------------
	//         speakersTrainingSession:get
	// ----------------------------------
	{
		displayName: 'speakersTrainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'speakersTrainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the speakersTrainingSession to get.',
	},
	// ----------------------------------
	//         speakersTrainingSession:getAll
	// ----------------------------------
	{
		displayName: 'Get all from session',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'speakersTrainingSession',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'training_session_id',
				name: 'training_session_id',
				type: 'string',
				default: '',
				description: 'Search by training_session_id',
			},
		],
	},
];
