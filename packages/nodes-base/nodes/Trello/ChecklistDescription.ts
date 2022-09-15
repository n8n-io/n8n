import { INodeProperties } from 'n8n-workflow';

export const checklistOperations: INodeProperties[] = [
	// ----------------------------------
	//         checklist
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['checklist'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new checklist',
				action: 'Create a checklist',
			},
			{
				name: 'Create Checklist Item',
				value: 'createCheckItem',
				description: 'Create a checklist item',
				action: 'Create checklist item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a checklist',
				action: 'Delete a checklist',
			},
			{
				name: 'Delete Checklist Item',
				value: 'deleteCheckItem',
				description: 'Delete a checklist item',
				action: 'Delete a checklist item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a checklist',
				action: 'Get a checklist',
			},
			{
				name: 'Get Checklist Items',
				value: 'getCheckItem',
				description: 'Get a specific checklist on a card',
				action: 'Get checklist items',
			},
			{
				name: 'Get Completed Checklist Items',
				value: 'completedCheckItems',
				description: 'Get the completed checklist items on a card',
				action: 'Get completed checklist items',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Returns many checklists for the card',
				action: 'Get many checklists',
			},
			{
				name: 'Update Checklist Item',
				value: 'updateCheckItem',
				description: 'Update an item in a checklist on a card',
				action: 'Update a checklist item',
			},
		],
		default: 'getAll',
	},
];

export const checklistFields: INodeProperties[] = [
	{
		displayName: 'Card',
		name: 'cardId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Card...',
				typeOptions: {
					searchListMethod: 'searchCards',
					searchFilterRequired: true,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://trello.com/c/e123456/card-name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://trello.com/c/([a-zA-Z0-9]{2,})/.*',
							errorMessage: 'Not a valid Trello Card URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://trello.com/c/([a-zA-Z0-9]{2,})',
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Trello Card ID',
						},
					},
				],
				placeholder: 'wiIaGwqE',
				url: '=https://trello.com/c/{{$value}}',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'delete',
					'create',
					'getAll',
					'deleteCheckItem',
					'getCheckItem',
					'updateCheckItem',
					'completeCheckItems',
				],
				resource: ['checklist'],
			},
		},
		description: 'The ID of the card',
	},

	// ----------------------------------
	//         checklist:create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['checklist'],
			},
		},
		description: 'The URL of the checklist to add',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['checklist'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'ID Of Checklist Source',
				name: 'idChecklistSource',
				type: 'string',
				default: '',
				description: 'The ID of a source checklist to copy into the new one',
			},
			{
				displayName: 'Position',
				name: 'pos',
				type: 'string',
				default: '',
				description:
					'The position of the checklist on the card. One of: top, bottom, or a positive number.',
			},
		],
	},

	// ----------------------------------
	//         checklist:delete
	// ----------------------------------
	{
		displayName: 'Checklist ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['checklist'],
			},
		},
		description: 'The ID of the checklist to delete',
	},

	// ----------------------------------
	//         checklist:getAll
	// ----------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['checklist'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         checklist:get
	// ----------------------------------
	{
		displayName: 'Checklist ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['checklist'],
			},
		},
		description: 'The ID of the checklist to get',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['checklist'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         checklist:createCheckItem
	// ----------------------------------
	{
		displayName: 'Checklist ID',
		name: 'checklistId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['createCheckItem'],
				resource: ['checklist'],
			},
		},
		description: 'The ID of the checklist to update',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['createCheckItem'],
				resource: ['checklist'],
			},
		},
		description: 'The name of the new check item on the checklist',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['createCheckItem'],
				resource: ['checklist'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Checked',
				name: 'checked',
				type: 'boolean',
				default: false,
				description: 'Whether the check item is already checked when created',
			},
			{
				displayName: 'Position',
				name: 'pos',
				type: 'string',
				default: '',
				description:
					'The position of the checklist on the card. One of: top, bottom, or a positive number.',
			},
		],
	},

	// ----------------------------------
	//         checklist:deleteCheckItem
	// ----------------------------------
	{
		displayName: 'CheckItem ID',
		name: 'checkItemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['deleteCheckItem'],
				resource: ['checklist'],
			},
		},
		description: 'The ID of the checklist item to delete',
	},

	// ----------------------------------
	//         checklist:getCheckItem
	// ----------------------------------
	{
		displayName: 'CheckItem ID',
		name: 'checkItemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getCheckItem'],
				resource: ['checklist'],
			},
		},
		description: 'The ID of the checklist item to get',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getCheckItem'],
				resource: ['checklist'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         checklist:updateCheckItem
	// ----------------------------------
	{
		displayName: 'CheckItem ID',
		name: 'checkItemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['updateCheckItem'],
				resource: ['checklist'],
			},
		},
		description: 'The ID of the checklist item to update',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['updateCheckItem'],
				resource: ['checklist'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name for the checklist item',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{
						name: 'Complete',
						value: 'complete',
					},
					{
						name: 'Incomplete',
						value: 'incomplete',
					},
				],
				default: 'complete',
			},
			{
				displayName: 'Checklist ID',
				name: 'checklistId',
				type: 'string',
				default: '',
				description: 'The ID of the checklist this item is in',
			},
			{
				displayName: 'Position',
				name: 'pos',
				type: 'string',
				default: '',
				description:
					'The position of the checklist on the card. One of: top, bottom, or a positive number.',
			},
		],
	},

	// ----------------------------------
	//         checklist:completedCheckItems
	// ----------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['completedCheckItems'],
				resource: ['checklist'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description:
					'Fields to return. Either "all" or a comma-separated list of: "idCheckItem", "state".',
			},
		],
	},
];
