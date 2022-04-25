import {
	INodeProperties,
} from 'n8n-workflow';

export const attributeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
			},
		},
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
	},
];

export const attributeFields: INodeProperties[] = [
	// ----------------------------------------
	//            attribute: create
	// ----------------------------------------
	{
		displayName: 'Event UUID',
		name: 'eventId',
		description: 'UUID of the event to attach the attribute to',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'URL',
				value: 'url',
			},
			{
				name: 'Comment',
				value: 'comment',
			},
		],
		required: true,
		default: 'text',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'create',
				],
			},
		},
	},
		{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'create',
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
					'attribute',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Distribution',
				name: 'distribution',
				type: 'options',
				default: 0,
				description: 'Who will be able to see this event once published',
				options: [
					{
						name: 'Your Organization Only',
						value: 0,
					},
					{
						name: 'This Community Only',
						value: 1,
					},
					{
						name: 'Connected Communities',
						value: 2,
					},
					{
						name: 'All Communities',
						value: 3,
					},
					{
						name: 'Sharing Group',
						value: 4,
					},
					{
						name: 'Inherit Event',
						value: 5,
					},
				],
			},
			{
				displayName: 'Sharing Group Name/ID',
				name: 'sharing_group_id',
				type: 'options',
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Use only for when <code>Sharing Group</code> is selected in <code>Distribution</code>',
				typeOptions: {
					loadOptionsMethod: 'getSharingGroups',
				},
			},
		],
	},

	// ----------------------------------------
	//            attribute: delete
	// ----------------------------------------
	{
		displayName: 'Attribute ID',
		name: 'attributeId',
		description: 'UUID or numeric ID of the attribute',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              attribute: get
	// ----------------------------------------
	{
		displayName: 'Attribute ID',
		name: 'attributeId',
		description: 'UUID or numeric ID of the attribute',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'attribute',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------------
	//            attribute: update
	// ----------------------------------------
	{
		displayName: 'Attribute ID',
		name: 'attributeId',
		description: 'ID of the attribute to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attribute',
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
					'attribute',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Distribution',
				name: 'distribution',
				type: 'options',
				default: 0,
				description: 'Who will be able to see this event once published',
				options: [
					{
						name: 'Your Organization Only',
						value: 0,
					},
					{
						name: 'This Community Only',
						value: 1,
					},
					{
						name: 'Connected Communities',
						value: 2,
					},
					{
						name: 'All Communities',
						value: 3,
					},
					{
						name: 'Sharing Group',
						value: 4,
					},
					{
						name: 'Inherit Event',
						value: 5,
					},
				],
			},
			{
				displayName: 'Sharing Group Name/ID',
				name: 'sharing_group_id',
				type: 'options',
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Use only for when <code>Sharing Group</code> is selected in <code>Distribution</code>',
				typeOptions: {
					loadOptionsMethod: 'getSharingGroups',
				},
			},
		],
	},
];
