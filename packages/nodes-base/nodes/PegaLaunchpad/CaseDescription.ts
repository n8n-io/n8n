import type { INodeProperties } from 'n8n-workflow';

export const caseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['case'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a case',
				action: 'Create a case',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a case',
				action: 'Get a case',
			},
			{
				name: 'Get Attachments',
				value: 'getAttachments',
				description: 'Get attachments for a case',
				action: 'Get case attachments',
			},
			{
				name: 'Get History',
				value: 'getHistory',
				description: 'Get history of a case',
				action: 'Get case history',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get a list of cases',
				action: 'Get many cases',
			},
			{
				name: 'Query Cases',
				value: 'queryCases',
				description: 'Query cases with advanced filtering',
				action: 'Query cases',
			},
		],
		default: 'create',
	},
];

export const caseFields: INodeProperties[] = [
	// ----------------------------------
	//         case:create
	// ----------------------------------
	{
		displayName: 'Case Type ID',
		name: 'caseTypeId',
		type: 'string',
		required: true,
		default: '',
		description: 'The identifier of the case type to create (e.g., BookingRequestCase)',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Case Content',
		name: 'content',
		type: 'json',
		default: '{}',
		description: 'JSON payload containing the case data fields',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Process ID',
		name: 'processId',
		type: 'string',
		default: 'pyStartCase',
		description: 'The process ID to use when creating the case',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------
	//         case:get
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the case to retrieve',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Lookup Data Page',
		name: 'lookupDataPage',
		type: 'string',
		required: true,
		default: 'ClaimLookUp',
		description: 'The name of the lookup data page to use for retrieving the case',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//         case:getMany
	// ----------------------------------
	{
		displayName: 'Data Page ID',
		name: 'dataPageId',
		type: 'string',
		required: true,
		default: 'ClaimList',
		description: 'The ID of the data page to query (e.g., ClaimList)',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Fields to Select',
		name: 'fields',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Field',
		description: 'Fields to include in the query results',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Name of the field to select (e.g., Name, Status, BusinessID)',
					},
				],
			},
		],
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
				resource: ['case'],
				operation: ['getMany'],
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
				resource: ['case'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Distinct Results Only',
				name: 'distinctResultsOnly',
				type: 'boolean',
				default: true,
				description: 'Whether to return only distinct results',
			},
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				typeOptions: {
					minValue: 1,
				},
			},
		],
	},

	// ----------------------------------
	//         case:getAttachments
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the case to get attachments for',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['getAttachments'],
			},
		},
	},

	// ----------------------------------
	//         case:getHistory
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the case to get history for',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['getHistory'],
			},
		},
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		required: true,
		default: 50,
		placeholder: '61',
		description: 'Number of history records to retrieve per page',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['getHistory'],
			},
		},
		typeOptions: {
			minValue: 1,
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
				resource: ['case'],
				operation: ['getHistory'],
			},
		},
		options: [
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Fields to Select',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Field',
				description:
					'Fields to include in the history response. If not specified, defaults to CreateDateTime, MessageText, PerformerUserName, and ID.',
				options: [
					{
						name: 'fieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name',
								name: 'field',
								type: 'string',
								default: '',
								placeholder: 'e.g., CreateDateTime',
								description: 'Name of the field to select',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//         case:queryCases
	// ----------------------------------
	{
		displayName: 'Data Page Name',
		name: 'dataPageName',
		type: 'string',
		required: true,
		default: 'ClaimList',
		placeholder: 'ClaimList',
		description: 'The name of the data page to query (e.g., ClaimList)',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['queryCases'],
			},
		},
	},
	{
		displayName: 'Fields to Select',
		name: 'fields',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Field',
		description:
			'Fields to include in the query results. If not specified, defaults to Name, Status, BusinessID, Description, ID, and @class.',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['queryCases'],
			},
		},
		options: [
			{
				name: 'fieldValues',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name',
						name: 'field',
						type: 'string',
						default: '',
						placeholder: 'e.g., Name, Status, BusinessID',
						description: 'Name of the field to select',
					},
				],
			},
		],
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 61,
		description: 'Number of results per page',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['queryCases'],
			},
		},
		typeOptions: {
			minValue: 1,
		},
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'string',
		default: '{}',
		description:
			'Complete filter object with logic and conditions. Supports expressions. Example: {"logic":"F1","filterConditions":{"F1":{"lhs":{"field":"CreateDateTime"},"comparator":"GT","rhs":{"value":"{{$JSON.queryDate}}"}}}}',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['queryCases'],
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
				resource: ['case'],
				operation: ['queryCases'],
			},
		},
		options: [
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Distinct Results Only',
				name: 'distinctResultsOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to return only distinct results',
			},
			{
				displayName: 'Use Extended Timeout',
				name: 'useExtendedTimeout',
				type: 'boolean',
				default: false,
				description: 'Whether to use extended timeout for the query',
			},
		],
	},
];
