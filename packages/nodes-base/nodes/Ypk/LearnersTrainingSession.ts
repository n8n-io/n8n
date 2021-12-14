import {
	INodeProperties,
} from 'n8n-workflow';

export const learnersTrainingSessionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'learnersTrainingSession',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an learnersTrainingSession',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all learnersTrainingSessions',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an learnersTrainingSession',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const learnersTrainingSessionFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'learnersTrainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'learnersTrainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the learnersTrainingSession to update.',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'learnersTrainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'Comment of learnersTrainingSession',
	},
	// ----------------------------------
	//         learnersTrainingSession:get
	// ----------------------------------
	{
		displayName: 'learnersTrainingSession ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'learnersTrainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the learnersTrainingSession to get.',
	},
	// ----------------------------------
	//         learnersTrainingSession:getAll
	// ----------------------------------
	{
		displayName: 'learnersTrainingSession ID',
		name: 'training_session_id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'learnersTrainingSession',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the training session to get.',
	},
];
