import {
	INodeProperties
} from 'n8n-workflow';

export const annexCostOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'annexCost',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an annexCost',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an annexCost',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all annexCosts of a session',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an annexCost',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsAnnexCosts: INodeProperties[] = [
	{
		displayName: 'Cost',
		name: 'cost',
		type: 'string',
		default: '',
		description: `annexCost's cost`,
	},
	{
		displayName: 'Title expense',
		name: 'expense',
		type: 'string',
		default: '',
		description: `annexCost's expense`,
	},
	{
		displayName: 'Quantity',
		name: 'quantity',
		type: 'string',
		default: '',
		description: `annexCost's quantity`,
	},
	{
		displayName: 'Owner_id',
		name: 'owner_id',
		type: 'string',
		default: '',
		description: `annexCost's owner_id`,
	},
	{
		displayName: 'Owner_type',
		name: 'owner_type',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Learner',
				value: 'Learner',
			},
			{
				name: 'Speaker',
				value: 'Speaker',
			},
		],
		description: `annexCost's owner_type`,
	}
];

export const annexCostFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Training Session ID',
		name: 'training_session_id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'annexCost',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the annexCost to update.',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'Session',
				value: 'session',
			},
			{
				name: 'Learner',
				value: 'learner',
			},
			{
				name: 'Speaker',
				value: 'speaker',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
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
					'annexCost',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsAnnexCosts,
		],
	},
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'annexCost ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'annexCost',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the annexCost to update.',
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
					'annexCost',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsAnnexCosts,
		],
	},
	// ----------------------------------
	//         annexCost:delete
	// ----------------------------------
	{
		displayName: 'annexCost ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'annexCost',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the annexCost to delete.',
	},
	// ----------------------------------
	//         annexCost:getAll
	// ----------------------------------
	{
		displayName: 'Training Session ID',
		name: 'training_session_id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'annexCost',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the annexCost to get.',
	},
];
