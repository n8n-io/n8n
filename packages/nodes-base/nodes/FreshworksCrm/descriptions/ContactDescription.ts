import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	// ----------------------------------------
	//             contact: create
	// ----------------------------------------
	{
		displayName: 'First Name',
		name: 'firstName',
		description: 'First name of the contact',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		description: 'Last name of the contact',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Email Address',
		name: 'emails',
		type: 'string',
		default: '',
		description: 'Email addresses of the contact',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
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
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the contact',
			},
			{
				displayName: 'Campaign Name or ID',
				name: 'campaign_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				description:
					'ID of the campaign that led your contact to your webapp. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City that the contact belongs to',
			},
			{
				displayName: 'Contact Status Name or ID',
				name: 'contact_status_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getContactStatuses',
				},
				description:
					'ID of the contact status that the contact belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country that the contact belongs to',
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
				description: 'External ID of the contact',
			},
			{
				displayName: 'Facebook',
				name: 'facebook',
				type: 'string',
				default: '',
				description: 'Facebook username of the contact',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
				description: 'Designation of the contact in the account they belong to',
			},
			{
				displayName: 'Keywords',
				name: 'keyword',
				type: 'string',
				default: '',
				description: 'Keywords that the contact used to reach your website/web app',
			},
			{
				displayName: 'Lead Source ID',
				name: 'lead_source_id',
				type: 'string', // not obtainable from API
				default: '',
				description: 'ID of the source where contact came from',
			},
			{
				displayName: 'Lifecycle Stage Name or ID',
				name: 'lifecycle_stage_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getLifecycleStages',
				},
				description:
					'ID of the lifecycle stage that the contact belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'LinkedIn',
				name: 'linkedin',
				type: 'string',
				default: '',
				description: 'LinkedIn account of the contact',
			},
			{
				displayName: 'Medium',
				name: 'medium',
				type: 'string',
				default: '',
				description: 'Medium that led your contact to your website/webapp',
			},
			{
				displayName: 'Mobile Number',
				name: 'mobile_number',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the contact',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user to whom the contact is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Sales Account Names or IDs',
				name: 'sales_accounts',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description:
					'Accounts which contact belongs to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State that the contact belongs to',
			},
			{
				displayName: 'Subscription Status',
				name: 'subscription_status',
				type: 'string', // not obtainable from API
				default: '',
				description: 'Status of subscription that the contact is in',
			},
			{
				displayName: 'Subscription Types',
				name: 'subscription_types',
				type: 'string', // not obtainable from API
				default: '',
				description: 'Type of subscription that the contact is in',
			},
			{
				displayName: 'Territory Name or ID',
				name: 'territory_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTerritories',
				},
				description:
					'ID of the territory that the contact belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Time Zone',
				name: 'time_zone',
				type: 'string',
				default: '',
				description: 'Timezone that the contact belongs to',
			},
			{
				displayName: 'Twitter',
				name: 'twitter',
				type: 'string',
				default: '',
				description: 'Twitter username of the contact',
			},
			{
				displayName: 'Work Number',
				name: 'work_number',
				type: 'string',
				default: '',
				description: 'Work phone number of the contact',
			},
			{
				displayName: 'Zipcode',
				name: 'zipcode',
				type: 'string',
				default: '',
				description: 'Zipcode of the region that the contact belongs to',
			},
		],
	},

	// ----------------------------------------
	//             contact: delete
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               contact: get
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             contact: getAll
	// ----------------------------------------
	{
		displayName: 'View Name or ID',
		name: 'view',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getContactViews',
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//             contact: update
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the contact',
			},
			{
				displayName: 'Campaign Name or ID',
				name: 'campaign_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				description:
					'ID of the campaign that led your contact to your webapp. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City that the contact belongs to',
			},
			{
				displayName: 'Contact Status Name or ID',
				name: 'contact_status_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getContactStatuses',
				},
				description:
					'ID of the contact status that the contact belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country that the contact belongs to',
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
				description: 'External ID of the contact',
			},
			{
				displayName: 'Facebook',
				name: 'facebook',
				type: 'string',
				default: '',
				description: 'Facebook username of the contact',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description: 'First name of the contact',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
				description: 'Designation of the contact in the account they belong to',
			},
			{
				displayName: 'Keywords',
				name: 'keyword',
				type: 'string',
				default: '',
				description: 'Keywords that the contact used to reach your website/web app',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'Last name of the contact',
			},
			{
				displayName: 'Lead Source Name or ID',
				name: 'lead_source_id',
				type: 'options',
				default: '',
				description:
					'ID of the source where contact came from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Lifecycle Stage Name or ID',
				name: 'lifecycle_stage_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getLifecycleStages',
				},
				description:
					'ID of the lifecycle stage that the contact belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'LinkedIn',
				name: 'linkedin',
				type: 'string',
				default: '',
				description: 'LinkedIn account of the contact',
			},
			{
				displayName: 'Medium',
				name: 'medium',
				type: 'string',
				default: '',
				description: 'Medium that led your contact to your website/webapp',
			},
			{
				displayName: 'Mobile Number',
				name: 'mobile_number',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the contact',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user to whom the contact is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Sales Account Names or IDs',
				name: 'sales_accounts',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description:
					'Accounts which contact belongs to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State that the contact belongs to',
			},
			{
				displayName: 'Subscription Status Name or ID',
				name: 'subscription_status',
				type: 'options',
				default: '',
				description:
					'Status of subscription that the contact is in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Subscription Types Name or ID',
				name: 'subscription_types',
				type: 'options',
				default: '',
				description:
					'Type of subscription that the contact is in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Territory Name or ID',
				name: 'territory_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTerritories',
				},
				description:
					'ID of the territory that the contact belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Time Zone',
				name: 'time_zone',
				type: 'string',
				default: '',
				description: 'Timezone that the contact belongs to',
			},
			{
				displayName: 'Twitter',
				name: 'twitter',
				type: 'string',
				default: '',
				description: 'Twitter username of the contact',
			},
			{
				displayName: 'Work Number',
				name: 'work_number',
				type: 'string',
				default: '',
				description: 'Work phone number of the contact',
			},
			{
				displayName: 'Zipcode',
				name: 'zipcode',
				type: 'string',
				default: '',
				description: 'Zipcode of the region that the contact belongs to',
			},
		],
	},
];
