import {
	INodeProperties,
} from 'n8n-workflow';

export const opportunityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new opportunity',
				action: 'Create an opportunity',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an opportunity',
				action: 'Delete an opportunity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an opportunity',
				action: 'Get an opportunity',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all opportunities',
				action: 'Get all opportunities',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an opportunity',
				action: 'Update an opportunity',
			},
		],
	},
];

export const opportunityDescription: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                opportunity:create                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'opportunityName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'opportunity',
				],
			},
		},
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'opportunity',
				],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email_from',
				type: 'string',
				default: '',
			},
			// {
			// 	displayName: 'Expected Closing Date',
			// 	name: 'date_deadline',
			// 	type: 'dateTime',
			// 	default: '',
			// },
			{
				displayName: 'Expected Revenue',
				name: 'expected_revenue',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Internal Notes',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: '1',
				options: [
					{
						name: '1',
						value: '1',
					},
					{
						name: '2',
						value: '2',
					},
					{
						name: '3',
						value: '3',
					},
				],
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				default: 0,
				typeOptions: {
					maxValue: 100,
					minValue: 0,
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                opportunity:get                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
					'delete',
				],
				resource: [
					'opportunity',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                opportunity:getAll                          */
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
		description: 'Whether to return all results or only up to a given limit',
	},

	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
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
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'get',
				],
				resource: [
					'opportunity',
				],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getModelFields',
				},
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                opportunity:update                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'opportunity',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'opportunity',
				],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email_from',
				type: 'string',
				default: '',
			},
			// {
			// 	displayName: 'Expected Closing Date',
			// 	name: 'date_deadline',
			// 	type: 'dateTime',
			// 	default: '',
			// },
			{
				displayName: 'Expected Revenue',
				name: 'expected_revenue',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Internal Notes',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: '1',
				options: [
					{
						name: '1',
						value: '1',
					},
					{
						name: '2',
						value: '2',
					},
					{
						name: '3',
						value: '3',
					},
				],
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				default: 0,
				typeOptions: {
					maxValue: 100,
					minValue: 0,
				},
			},
		],
	},
];
