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
				description: 'Create a lead',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a lead',
			},
			{
				name: 'Get Summary',
				value: 'getSummary',
				description: `Returns an overview of Lead's metadata.`,
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all leads',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
			},
			{
				name: 'Add Lead To Campaign',
				value: 'addToCampaign',
				description: 'Add lead to a campaign',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const leadFields = [

/* -------------------------------------------------------------------------- */
/*                                lead:create                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				]
			},
		},
		description: 'Company of the lead. If person account record types have been enabled, and if the value of Company is null, the lead converts to a person account.',
	},
	{
		displayName: 'Last Name',
		name: 'lastname',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				]
			},
		},
		description: 'Required. Last name of the lead. Limited to 80 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
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
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City for the address of the lead.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Email address for the lead.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the lead.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State for the address of the lead.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title for the lead, for example CFO or CEO.',
			},
			{
				displayName: 'Jigsaw',
				name: 'jigsaw',
				type: 'string',
				default: '',
				description: `references the ID of a contact in Data.com.
				If a lead has a value in this field, it means that a contact was imported as a lead from Data.com.`,
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'string',
				default: '',
				description: 'Rating of the lead.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadStatuses',
				},
				default: '',
				description: 'Status code for this converted lead.',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				description: 'Street number and name for the address of the lead',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the lead.',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Website for the lead.',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'Website for the lead.',
			},
			{
				displayName: 'Fist Name',
				name: 'firstname',
				type: 'string',
				default: '',
				description: 'First name of the lead. Limited to 40 characters.',
			},
			{
				displayName: 'Lead Source',
				name: 'leadSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadSources',
				},
				default: '',
				description: 'Source from which the lead was obtained.',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: 'Postal code for the address of the lead. Label is Zip/Postal Code.',
			},
			{
				displayName: 'Salutation',
				name: 'salutation',
				type: 'string',
				default: '',
				description: 'Salutation for the lead.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Description of the lead.',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
					numberStepSize: 1,
				},
				default: '',
				description: 'Annual revenue for the company of the lead.',
			},
			{
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'number',
				typeOptions: {
					numberStepSize: 1,
				},
				default: '',
				description: 'Number of employees at the lead’s company. Label is Employees.',
			},
			{
				displayName: 'Is Unread By Owner',
				name: 'IsUnreadByOwner',
				type: 'Boolean',
				default: false,
				description: 'If true, lead has been assigned, but not yet viewed. See Unread Leads for more information. Label is Unread By Owner.',
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                 lead:update                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'update',
				]
			},
		},
		description: 'Id of Lead that needs to be fetched',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
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
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Company of the lead. If person account record types have been enabled, and if the value of Company is null, the lead converts to a person account.',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
				description: 'Required. Last name of the lead. Limited to 80 characters.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City for the address of the lead.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Email address for the lead.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the lead.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State for the address of the lead.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title for the lead, for example CFO or CEO.',
			},
			{
				displayName: 'Jigsaw',
				name: 'jigsaw',
				type: 'string',
				default: '',
				description: `references the ID of a contact in Data.com.
				If a lead has a value in this field, it means that a contact was imported as a lead from Data.com.`,
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'string',
				default: '',
				description: 'Rating of the lead.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadStatuses',
				},
				default: '',
				description: 'Status code for this converted lead.',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				description: 'Street number and name for the address of the lead',
			},
			{
				displayName: 'Owner',
				name: 'ownerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the lead.',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Website for the lead.',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'Website for the lead.',
			},
			{
				displayName: 'Fist Name',
				name: 'firstname',
				type: 'string',
				default: '',
				description: 'First name of the lead. Limited to 40 characters.',
			},
			{
				displayName: 'Lead Source',
				name: 'leadSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadSources',
				},
				default: '',
				description: 'Source from which the lead was obtained.',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: 'Postal code for the address of the lead. Label is Zip/Postal Code.',
			},
			{
				displayName: 'Salutation',
				name: 'salutation',
				type: 'string',
				default: '',
				description: 'Salutation for the lead.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Description of the lead.',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
					numberStepSize: 1,
				},
				default: '',
				description: 'Annual revenue for the company of the lead.',
			},
			{
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'number',
				typeOptions: {
					numberStepSize: 1,
				},
				default: '',
				description: 'Number of employees at the lead’s company. Label is Employees.',
			},
			{
				displayName: 'Is Unread By Owner',
				name: 'IsUnreadByOwner',
				type: 'Boolean',
				default: false,
				description: 'If true, lead has been assigned, but not yet viewed. See Unread Leads for more information. Label is Unread By Owner.',
			},
		]
	},

/* -------------------------------------------------------------------------- */
/*                                  lead:get                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'get',
				]
			},
		},
		description: 'Id of Lead that needs to be fetched',
	},
/* -------------------------------------------------------------------------- */
/*                                  lead:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'delete',
				]
			},
		},
		description: 'Id of Lead that needs to be fetched',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
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
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                            contact:addToCampaign                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'addToCampaign',
				]
			},
		},
		description: 'Id of contact that needs to be fetched',
	},
	{
		displayName: 'Campaign',
		name: 'campaignId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'addToCampaign',
				]
			},
		},
		description: 'Id of the campaign that needs to be fetched',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'addToCampaign',
				],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Controls the HasResponded flag on this object',
			},
		]
	},
] as INodeProperties[];
