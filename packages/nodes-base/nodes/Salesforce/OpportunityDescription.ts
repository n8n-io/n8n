import { INodeProperties } from 'n8n-workflow';

export const opportunityOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
			},
		},
		options: [
			{
				name: 'Add Note',
				value: 'addNote',
				description: 'Add note to an opportunity',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create an opportunity',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an opportunity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an opportunity',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all opportunities',
			},
			{
				name: 'Get Summary',
				value: 'getSummary',
				description: `Returns an overview of opportunity's metadata.`,
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an opportunity',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const opportunityFields = [

/* -------------------------------------------------------------------------- */
/*                                opportunity:create                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'create',
				]
			},
		},
		description: 'Required. Last name of the opportunity. Limited to 80 characters.',
	},
	{
		displayName: 'Close Date',
		name: 'closeDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'create',
				]
			},
		},
		description: 'Required. Date when the opportunity is expected to close.',
	},
	{
		displayName: 'Stage Name',
		name: 'stageName',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getStages'
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'create',
				]
			},
		},
		description: 'Required. Date when the opportunity is expected to close.',
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
					'opportunity',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Account',
				name: 'accountId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description: 'ID of the account associated with this opportunity.',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: '',
				description: 'Estimated total sale amount',
			},
			{
				displayName: 'Campaign',
				name: 'campaignId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				default: '',
				description: 'Id of the campaign that needs to be fetched',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the opportunity. Label is Contact Description. Limit: 32 KB.',
			},
			{
				displayName: 'Forecast Category Name',
				name: 'forecastCategoryName',
				type: 'string',
				default: '',
				description: 'It is implied, but not directly controlled, by the StageName field',
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
				displayName: 'Next Step',
				name: 'nextStep',
				type: 'string',
				default: '',
				description: 'Description of next task in closing opportunity. Limit: 255 characters.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the opportunity.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the opportunity.',
			},
			{
				displayName: 'Pricebook2 Id',
				name: 'pricebook2Id',
				type: 'string',
				default: '',
				description: 'ID of a related Pricebook2 object',
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				typeOptions: {
					numberPrecision: 1,
				},
				default: '',
				description: 'Percentage of estimated confidence in closing the opportunity',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Business',
						valie: 'Business',
					},
					{
						name: 'New Business',
						valie: 'New Business',
					},
				],
				description: 'Type of opportunity. For example, Existing Business or New Business. Label is Opportunity Type.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 opportunity:update                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'update',
				]
			},
		},
		description: 'Id of opportunity that needs to be fetched',
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
					'opportunity',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Account',
				name: 'accountId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description: 'ID of the account associated with this opportunity.',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: '',
				description: 'Estimated total sale amount',
			},
			{
				displayName: 'Campaign',
				name: 'campaignId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				default: '',
				description: 'Id of the campaign that needs to be fetched',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description: 'Required. Date when the opportunity is expected to close.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the opportunity. Label is Contact Description. Limit: 32 KB.',
			},
			{
				displayName: 'Forecast Category Name',
				name: 'forecastCategoryName',
				type: 'string',
				default: '',
				description: 'It is implied, but not directly controlled, by the StageName field',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Required. Last name of the opportunity. Limited to 80 characters.',
			},
			{
				displayName: 'Next Step',
				name: 'nextStep',
				type: 'string',
				default: '',
				description: 'Description of next task in closing opportunity. Limit: 255 characters.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the opportunity.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the opportunity.',
			},
			{
				displayName: 'Pricebook2 Id',
				name: 'pricebook2Id',
				type: 'string',
				default: '',
				description: 'ID of a related Pricebook2 object',
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				typeOptions: {
					numberPrecision: 1,
				},
				default: '',
				description: 'Percentage of estimated confidence in closing the opportunity',
			},
			{
				displayName: 'Stage Name',
				name: 'stageName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStages'
				},
				default: '',
				description: 'Required. Date when the opportunity is expected to close.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Business',
						valie: 'Business',
					},
					{
						name: 'New Business',
						valie: 'New Business',
					},
				],
				description: 'Type of opportunity. For example, Existing Business or New Business. Label is Opportunity Type.',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                  opportunity:get                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'get',
				]
			},
		},
		description: 'Id of opportunity that needs to be fetched',
	},
/* -------------------------------------------------------------------------- */
/*                                  opportunity:delete                        */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'delete',
				]
			},
		},
		description: 'Id of opportunity that needs to be fetched',
	},
/* -------------------------------------------------------------------------- */
/*                                 opportunity:getAll                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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
					'opportunity',
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
					'opportunity',
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
/*                             opportunity:addNote                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'addNote',
				]
			},
		},
		description: 'Id of opportunity that needs to be fetched',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'addNote',
				]
			},
		},
		description: 'Title of the note.',
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
					'opportunity',
				],
				operation: [
					'addNote',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Body of the note. Limited to 32 KB.',
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'If true, only the note owner or a user with the “Modify All Data” permission can view the note or query it via the API',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the user who owns the note.',
			},
		]
	},
] as INodeProperties[];
