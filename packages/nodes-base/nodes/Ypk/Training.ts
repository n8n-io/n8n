import {
	INodeProperties
} from 'n8n-workflow';

export const trainingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'training',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an training',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an training',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an training',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all trainings',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an training',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsTrainings: INodeProperties[] = [
	{
		displayName: 'Référence',
		name: 'reference',
		type: 'string',
		default: '',
		description: `training's reference`,
	},
	{
		displayName: 'Certified',
		name: 'certified',
		type: 'boolean',
		default: '',
		description: `training's certified`,
	},
];

export const trainingFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'training',
				],
			},
		},
		description: 'training\'s firstname.',
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
					'training',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsTrainings,
		],
	},
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'training ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'training',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the training to update.',
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
					'training',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'training',
						],
					},
				},
				description: 'training\'s firstname.',
			},
			...additionalFieldsTrainings,
		],
	},
	// ----------------------------------
	//         training:delete
	// ----------------------------------
	{
		displayName: 'training ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'training',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the training to delete.',
	},
	// ----------------------------------
	//         training:get
	// ----------------------------------
	{
		displayName: 'training ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'training',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the training to get.',
	},
	// ----------------------------------
	//         training:getAll
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
					'training',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search by name',
				name: 'searchByName',
				type: 'string',
				default: '',
				description: 'Search by name',
			},
			{
				displayName: 'Search by reference',
				name: 'searchByReference',
				type: 'string',
				default: '',
				description: 'Search by reference',
			},
		],
	},
];
