import {
	INodeProperties,
} from 'n8n-workflow';

import {
	currencies,
	makeCustomFieldsFixedCollection,
	makeGetAllFields,
} from './SharedFields';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
];

export const dealFields: INodeProperties[] = [
	// ----------------------------------------
	//              deal: create
	// ----------------------------------------
	{
		displayName: 'Deal Name',
		name: 'dealName',
		type: 'string',
		required: true,
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
	},

	// ----------------------------------------
	//             deal: upsert
	// ----------------------------------------
	{
		displayName: 'Deal Name',
		name: 'dealName',
		description: 'Name of the deal. If a record with this deal name exists it will be updated, otherwise a new one will be created.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'upsert',
				],
			},
		},
	},
	// ----------------------------------------
	//          deal: create + upsert
	// ----------------------------------------
	{
		displayName: 'Stage',
		name: 'stage',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getDealStage',
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
					'upsert',
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
				resource: [
					'deal',
				],
				operation: [
					'create',
					'upsert',
				],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'Amount',
				type: 'number',
				default: '',
				description: 'Monetary amount of the deal.',
			},
			{
				displayName: 'Closing Date',
				name: 'Closing_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated.',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('deal'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Lead Conversion Time',
				name: 'Lead_Conversion_Time',
				type: 'number',
				default: '',
				description: 'Averge number of days to convert the lead into a deal.',
			},
			{
				displayName: 'Next Step',
				name: 'Next_Step',
				type: 'string',
				default: '',
				description: 'Description of the next step in the sales process.',
			},
			{
				displayName: 'Overall Sales Duration',
				name: 'Overall_Sales_Duration',
				type: 'number',
				default: '',
				description: 'Averge number of days to convert the lead into a deal and to win the deal.',
			},
			{
				displayName: 'Probability',
				name: 'Probability',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: '',
				description: 'Probability of deal closure as a percentage. For example, enter 12 for 12%.',
			},
			{
				displayName: 'Sales Cycle Duration',
				name: 'Sales_Cycle_Duration',
				type: 'number',
				default: 0,
				description: 'Averge number of days for the deal to be won.',
			},
		],
	},

	// ----------------------------------------
	//               deal: delete
	// ----------------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		description: 'ID of the deal to delete.',
		type: 'string',
		required: true,
		default: '',
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
	},

	// ----------------------------------------
	//                deal: get
	// ----------------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		description: 'ID of the deal to retrieve.',
		type: 'string',
		required: true,
		default: '',
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

	// ----------------------------------------
	//               deal: getAll
	// ----------------------------------------
	...makeGetAllFields('deal'),

	// ----------------------------------------
	//               deal: update
	// ----------------------------------------
	{
		displayName: 'Deal ID',
		name: 'dealId',
		description: 'ID of the deal to update.',
		type: 'string',
		required: true,
		default: '',
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
				displayName: 'Amount',
				name: 'Amount',
				type: 'number',
				default: '',
				description: 'Monetary amount of the deal.',
			},
			{
				displayName: 'Closing Date',
				name: 'Closing_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'string',
				default: '',
				description: 'Symbol of the currency in which revenue is generated.',
			},
			makeCustomFieldsFixedCollection('deal'),
			{
				displayName: 'Deal Name',
				name: 'Deal_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Lead Conversion Time',
				name: 'Lead_Conversion_Time',
				type: 'number',
				default: '',
				description: 'Averge number of days to convert the lead into a deal.',
			},
			{
				displayName: 'Next Step',
				name: 'Next_Step',
				type: 'string',
				default: '',
				description: 'Description of the next step in the sales process.',
			},
			{
				displayName: 'Overall Sales Duration',
				name: 'Overall_Sales_Duration',
				type: 'number',
				default: '',
				description: 'Averge number of days to convert the lead into a deal and to win the deal.',
			},
			{
				displayName: 'Probability',
				name: 'Probability',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: '',
				description: 'Probability of deal closure as a percentage. For example, enter 12 for 12%.',
			},
			{
				displayName: 'Sales Cycle Duration',
				name: 'Sales_Cycle_Duration',
				type: 'number',
				default: 0,
				description: 'Averge number of days to win the deal.',
			},
			{
				displayName: 'Stage',
				name: 'Stage',
				type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getDealStage',
					},
				default: [],
			},
		],
	},
];
