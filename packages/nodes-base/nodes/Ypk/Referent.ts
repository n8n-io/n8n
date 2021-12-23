import {
	INodeProperties,
} from 'n8n-workflow';

export const referentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'referent',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a referent',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a referent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a referent',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all referents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a referent',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsReferents: INodeProperties[] = [
  {
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: `referent's first name`,
	},
  {
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		description: `referent's last name`,
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: `referent's email`,
	},
	{
		displayName: 'Phone',
		name: 'phone_number',
		type: 'string',
		default: '',
		description: `referent's phone`,
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'string',
		default: '',
		description: `Referent's position`,
	},
];

export const referentFields: INodeProperties[] = [
	// ----------------------------------
	//         referent:create
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
					'referent',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsReferents,
		],
	},
	// ----------------------------------
	//         referent:update
	// ----------------------------------
	{
		displayName: 'Update Fields',
		name: 'additionalFields',
		type: 'collection',
		description: 'The fields to update.',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'company',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsReferents,
		],
	},
	// ----------------------------------
	//         referent:delete
	// ----------------------------------
	{
		displayName: 'Referent ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'referent',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the company to delete.',
	},
	// ----------------------------------
	//         company:get
	// ----------------------------------
	{
		displayName: 'company ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the company to get.',
	},
	// ----------------------------------
	//         companies:getAll
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
					'company',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search by name',
				name: 'search_name',
				type: 'string',
				default: '',
				description: 'Search by name',
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
