import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an contact',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];


export const contactFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Training Session id',
		name: 'training_session_id',
		type: 'string',
		default: '',
		description: `contact's training_session_id`,
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
	},
	{
		displayName: 'Contactable Type',
		name: 'contactable_type',
		type: 'options',
		options: [
			{
				name: 'Apprenant',
				value: 'Learner',
			},
			{
				name: 'Entreprise',
				value: 'Company',
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
		displayName: 'Contactable ID',
		name: 'contactable_id',
		type: 'string',
		default: '',
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
		description: `contact's contactable_id`,
	},
	{
		displayName: 'Statut',
		name: 'contact_status_id',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getContactStatusesOptions',
		},
		default: 0,
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
		description: `trainingSession's contact_status_id`,
	},
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'contact ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the contact to update.',
	},
	{
		displayName: 'Statut',
		name: 'contact_status_id',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getContactStatusesOptions',
		},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: `trainingSession's contact_status_id`,
	},
	// ----------------------------------
	//         contact:delete
	// ----------------------------------
	{
		displayName: 'contact ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the contact to delete.',
	},
	// ----------------------------------
	//         contact:get
	// ----------------------------------
	{
		displayName: 'contact ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the contact to get.',
	},
	// ----------------------------------
	//         contact:getAll
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
					'contact',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the contact to get.',
	},
];
