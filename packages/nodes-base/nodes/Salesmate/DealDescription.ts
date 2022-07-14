import { INodeProperties } from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a deal',
				action: 'Create a deal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
				action: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
				action: 'Get a deal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all deals',
				action: 'Get all deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
				action: 'Update a deal',
			},
		],
		default: 'create',
	},
];

export const dealFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                deal:create                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Owner Name or ID',
		name: 'owner',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Primary Contact Name or ID',
		name: 'primaryContact',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getContacts',
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Primary contact for the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		required: true,
	},
	{
		displayName: 'Pipeline',
		name: 'pipeline',
		type: 'options',
		options: [
			{
				name: 'Sales',
				value: 'Sales',
			},
		],
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'Open',
		options: [
			{
				name: 'Open',
				value: 'Open',
			},
			{
				name: 'Close',
				value: 'Close',
			},
			{
				name: 'Lost',
				value: 'Lost',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Stage',
		name: 'stage',
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'New (Untouched)',
				value: 'New (Untouched)',
			},
			{
				name: 'Contacted',
				value: 'Contacted',
			},
			{
				name: 'Qualified',
				value: 'Qualified',
			},
			{
				name: 'In Negotiation',
				value: 'In Negotiation',
			},
			{
				name: 'Proposal Presented',
				value: 'Proposal Presented',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		default: false,
		description: 'Whether the data should include the fields details',
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
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				type: 'string',
				default: '',
				description: 'This field contains details related to the deal',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'This field contains tags associated with an deal',
			},
			{
				displayName: 'Primary Company Name or ID',
				name: 'primaryCompany',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: '',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{
						name: 'Ads',
						value: 'Ads',
					},
					{
						name: 'Referrals',
						value: 'Referrals',
					},
					{
						name: 'Website',
						value: 'Website',
					},
					{
						name: 'Word of Mouth',
						value: 'Word of mouth',
					},
				],
				default: 'Ads',
			},
			{
				displayName: 'Estimated Close Date',
				name: 'estimatedCloseDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Deal Value',
				name: 'dealValue',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: 0,
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 'Medium',
				options: [
					{
						name: 'High',
						value: 'High',
					},
					{
						name: 'Medium',
						value: 'Medium',
					},
					{
						name: 'Low',
						value: 'Low',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                deal:update                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		default: false,
		description: 'Whether the data should include the fields details',
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
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
			},
			{
				displayName: 'Primary Contact Name or ID',
				name: 'primaryContact',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
			},
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'options',
				options: [
					{
						name: 'Sales',
						value: 'Sales',
					},
				],
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'Open',
				options: [
					{
						name: 'Open',
						value: 'Open',
					},
					{
						name: 'Close',
						value: 'Close',
					},
					{
						name: 'Lost',
						value: 'Lost',
					},
				],
			},
			{
				displayName: 'Stage',
				name: 'stage',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Contacted',
						value: 'Contacted',
					},
					{
						name: 'In Negotiation',
						value: 'In Negotiation',
					},
					{
						name: 'New (Untouched)',
						value: 'New (Untouched)',
					},
					{
						name: 'Proposal Presented',
						value: 'Proposal Presented',
					},
					{
						name: 'Qualified',
						value: 'Qualified',
					},
				],
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				type: 'string',
				default: '',
				description: 'This field contains details related to the deal',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'This field contains tags associated with an deal',
			},
			{
				displayName: 'Primary Company Name or ID',
				name: 'primaryCompany',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: '',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{
						name: 'Ads',
						value: 'Ads',
					},
					{
						name: 'Referrals',
						value: 'Referrals',
					},
					{
						name: 'Website',
						value: 'Website',
					},
					{
						name: 'Word of Mouth',
						value: 'Word of mouth',
					},
				],
				default: 'Ads',
			},
			{
				displayName: 'Estimated Close Date',
				name: 'estimatedCloseDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Deal Value',
				name: 'dealValue',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: 0,
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 'Medium',
				options: [
					{
						name: 'High',
						value: 'High',
					},
					{
						name: 'Medium',
						value: 'Medium',
					},
					{
						name: 'Low',
						value: 'Low',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 deal:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
		default: false,
		description: 'Whether the data should include the fields details',
	},
/* -------------------------------------------------------------------------- */
/*                                 deal:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'deal',
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
			maxValue: 25,
		},
		default: 10,
		description: 'Max number of results to return',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'deal',
				],
			},
		},
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
					'deal',
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
				description: 'Comma-separated list of fields to return',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'string',
				default: '',
				description: 'The field to sort by',
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
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filtersJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'deal',
				],
				jsonParameters: [
					true,
				],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		placeholder: 'Add filter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getAll',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: {},
		options: [
			{
				name: 'filtersUi',
				displayName: 'Filters',
				values: [
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						options: [
							{
								name: 'AND',
								value: 'AND',
							},
							{
								name: 'OR',
								value: 'OR',
							},
						],
						default: 'AND',
					},
					{
						displayName: 'Conditions',
						name: 'conditions',
						placeholder: 'Add Condition',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'conditionsUi',
								displayName: 'Conditions',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'options',
										options: [
											{
												name: 'Title',
												value: 'title',
											},
											{
												name: 'Tags',
												value: 'tags',
											},
											{
												name: 'Last Communication Mode',
												value: 'lastCommunicationMode',
											},
										],
										default: 'title',
									},
									{
										displayName: 'Condition',
										name: 'condition',
										type: 'options',
										// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
										options: [
											{
												name: 'Equals',
												value: 'EQUALS',
											},
											{
												name: 'Not Equals',
												value: 'NOT_EQUALS',
											},
											{
												name: 'CONTAINS',
												value: 'Contains',
											},
											{
												name: 'Does Not Contains',
												value: 'DOES_NOT_CONTAINS',
											},
											{
												name: 'Empty',
												value: 'EMPTY',
											},
											{
												name: 'Not Empty',
												value: 'NOT_EMPTY',
											},
											{
												name: 'Starts With',
												value: 'STARTS_WITH',
											},
											{
												name: 'Ends With',
												value: 'ENDS_WITH',
											},
										],
										default: 'EQUALS',
										description: 'Value of the property to set',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                deal:delete                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'If more than one deal add them separated by ,',
	},
];
