import { INodeProperties } from 'n8n-workflow';

export const leadOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a lead',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all leads',
			},
			{
				name: 'Get Fields',
				value: 'getFields',
				description: `Get the fields' metadata`,
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a lead',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const leadFields = [

/* -------------------------------------------------------------------------- */
/*                                 lead:create                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				],
			},
		},
		description: `User's last name`,
	},
	{
		displayName: 'Additional Fields',
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
					'lead',
				],
			},
		},
		options: [
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: 0,
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email Opt Out',
				name: 'emailOptOut',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIndustries',
				},
				default: '',
			},
			{
				displayName: 'Is Record Duplicate',
				name: 'isRecordDuplicate',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Lead Source',
				name: 'leadSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadSources',
				},
				default: '',
			},
			{
				displayName: 'Lead Status',
				name: 'leadStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadStatuses',
				},
				default: '',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'No. of Employees',
				name: 'numberOfEmployees',
				type: 'number',
				default: 1,
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'salutation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Secondary Email',
				name: 'secondaryEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'SkypeId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Twitter',
				name: 'twitter',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Address',
		name: 'addressUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Address',
		typeOptions: {
			multipleValues: false,
		},
		required: false,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: 'addressValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'Street',
						name: 'street',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip Code',
						name: 'zipCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 lead:update                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
			displayName: 'Additional Fields',
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
						'lead',
					],
				},
			},
			options: [
				{
					displayName: 'Annual Revenue',
					name: 'annualRevenue',
					type: 'number',
					typeOptions: {
						numberPrecision: 2,
					},
					default: 0,
				},
				{
					displayName: 'Company',
					name: 'company',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Email',
					name: 'email',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Email Opt Out',
					name: 'emailOptOut',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'Fax',
					name: 'fax',
					type: 'string',
					default: '',
				},
				{
					displayName: 'First Name',
					name: 'firstName',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Industry',
					name: 'industry',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getIndustries',
					},
					default: '',
				},
				{
					displayName: 'Is Record Duplicate',
					name: 'isRecordDuplicate',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'Last Name',
					name: 'lastName',
					type: 'string',
					default: '',
					description: `User's last name`,
				},
				{
					displayName: 'Lead Source',
					name: 'leadSource',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getLeadSources',
					},
					default: '',
				},
				{
					displayName: 'Lead Status',
					name: 'leadStatus',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getLeadStatuses',
					},
					default: '',
				},
				{
					displayName: 'Mobile',
					name: 'mobile',
					type: 'string',
					default: '',
				},
				{
					displayName: 'No. of Employees',
					name: 'numberOfEmployees',
					type: 'number',
					default: 1,
				},
				{
					displayName: 'Owner',
					name: 'owner',
					type: 'options',
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getUsers',
					},
				},
				{
					displayName: 'Phone',
					name: 'phone',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Salutation',
					name: 'salutation',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Secondary Email',
					name: 'secondaryEmail',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Skype ID',
					name: 'SkypeId',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Title',
					name: 'title',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Twitter',
					name: 'twitter',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Website',
					name: 'website',
					type: 'string',
					default: '',
				},
			],
	},
	{
		displayName: 'Address',
		name: 'addressUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Address',
		typeOptions: {
			multipleValues: false,
		},
		required: false,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				name: 'addressValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'Street',
						name: 'street',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip Code',
						name: 'zipCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 lead:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'get',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                 lead:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'getAll',
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
				resource: [
					'lead',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Approved',
				name: 'approved',
				type: 'boolean',
				default: true,
				description: 'To get the list of approved records. Default value is true.',
			},
			{
				displayName: 'Converted',
				name: 'converted',
				type: 'boolean',
				default: false,
				description: 'To get the list of converted records. Default value is false',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLeadFields',
				},
				default: [],
			},
			{
				displayName: 'Include Child',
				name: 'includeChild',
				type: 'boolean',
				default: false,
				description: 'To include records from the child territories. True includes child territory records',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLeadFields',
				},
				default: [],
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Order sort attribute ascending or descending.',
			},
			{
				displayName: 'Territory ID',
				name: 'territoryId',
				type: 'string',
				default: '',
				description: 'To get the list of records based on the territory	',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 lead:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'delete',
				],
			},
		},
	},
] as INodeProperties[];
