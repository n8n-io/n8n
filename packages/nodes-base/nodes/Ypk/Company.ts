import {
	INodeProperties,
} from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a company',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a company',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all companies',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

const additionalFieldsCompanies: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: `company's email`,
	},
	{
		displayName: 'Phone',
		name: 'phone_number',
		type: 'string',
		default: '',
		description: `company's phone`,
	},
	{
		displayName: 'Siret',
		name: 'siret',
		type: 'string',
		default: '',
		description: `company's siret`,
	},
  {
		displayName: 'Company category',
		name: 'company_category',
		type: 'string',
		default: '',
		description: `company's category`,
	},
  {
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
		description: `company's website`,
	},
  {
		displayName: 'Code APE',
		name: 'code_ape',
		type: 'string',
		default: '',
		description: `company's code APE`,
	},
  {
		displayName: 'TVA',
		name: 'numero_tva_intracommunautaire',
		type: 'string',
		default: '',
		description: `company's tva`,
	},
  {
		displayName: 'Financement',
		name: 'financing',
		type: 'string',
		default: '',
		description: `company's financing`,
	},
  {
		displayName: 'Address Street',
		name: 'street',
		type: 'string',
		default: '',
		description: `company's address street`,
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
		description: `company's address City`,
	},
	{
		displayName: 'Address Country',
		name: 'country',
		type: 'string',
		default: '',
		description: `company's address City`,
	},
  {
		displayName: 'Referent id',
		name: 'referent_id',
		type: 'string',
		default: '',
		description: `company's referent id`,
	},
  {
		displayName: 'Referent first name',
		name: 'referent_first_name',
		type: 'string',
		default: '',
		description: `company's referent first name`,
	},
  {
		displayName: 'Referent last name',
		name: 'referent_last_name',
		type: 'string',
		default: '',
		description: `company's referent last name`,
	},
  {
		displayName: 'Referent phone',
		name: 'referent_phone',
		type: 'string',
		default: '',
		description: `company's referent phone`,
	},
  {
		displayName: 'Referent position',
		name: 'referent_position',
		type: 'string',
		default: '',
		description: `company's referent position`,
	},
	{
		displayName: 'Company type id',
		name: 'company_type_id',
		type: 'collection',
		default: '',
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'TPE/PME',
						value: '1',
					},
					{
						name: 'Grand compte',
						value: '2',
					},
					{
						name: 'Public',
						value: '3',
					},
          {
						name: 'Collectivité territoriale',
						value: '4',
					},
				],
				default: '',
			},
		],
		description: `companies' type id`,
	},
];

export const companyFields: INodeProperties[] = [
	// ----------------------------------
	//         company:create
	// ----------------------------------
	{
		displayName: 'Raison Sociale',
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
					'company',
				],
			},
		},
		description: 'company\'s name.',
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
					'company',
				],
			},
		},
		default: {},
		options: [
			...additionalFieldsCompanies,
		],
	},
	// ----------------------------------
	//         company:update
	// ----------------------------------
	{
		displayName: 'company ID',
		name: 'id',
		type: 'string',
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
		default: '',
		required: true,
		description: 'ID of the company to update.',
	},
  {
		displayName: 'Raison sociale',
		name: 'name',
		type: 'string',
		default: '',

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
		description: 'company\'s name.',
	},
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
			...additionalFieldsCompanies,
		],
	},
	// ----------------------------------
	//         company:delete
	// ----------------------------------
	{
		displayName: 'Company ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'company',
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
