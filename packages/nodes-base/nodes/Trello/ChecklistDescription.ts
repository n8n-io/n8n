import {
	INodeProperties,
} from 'n8n-workflow';

export const checklistOperations: INodeProperties[] = [
	// ----------------------------------
	//         checklist
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'checklist',
				],
			},
		},
		options: [
			{
				name: 'Create Checklist Item',
				value: 'createCheckItem',
				description: 'Create a checklist item',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new checklist',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a checklist',
			},
			{
				name: 'Delete Checklist Item',
				value: 'deleteCheckItem',
				description: 'Delete a checklist item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a checklist',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all checklists for the card',
			},
			{
				name: 'Get Checklist Items',
				value: 'getCheckItem',
				description: 'Get a specific checklist on a card',
			},
			{
				name: 'Get Completed Checklist Items',
				value: 'completedCheckItems',
				description: 'Get the completed checklist items on a card',
			},
			{
				name: 'Update Checklist Item',
				value: 'updateCheckItem',
				description: 'Update an item in a checklist on a card',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

];

export const checklistFields: INodeProperties[] = [
	// ----------------------------------
	//         checklist:create
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card to add checklist to.',
	},
	{
		displayName: 'Name',
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
					'checklist',
				],
			},
		},
		description: 'The URL of the checklist to add.',
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
					'checklist',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Id Of Checklist Source',
				name: 'idChecklistSource',
				type: 'string',
				default: '',
				description: 'The ID of a source checklist to copy into the new one.',
			},
			{
				displayName: 'Position',
				name: 'pos',
				type: 'string',
				default: '',
				description: 'The position of the checklist on the card. One of: top, bottom, or a positive number.',
			},
		],
	},

	// ----------------------------------
	//         checklist:delete
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.',
	},
	{
		displayName: 'Checklist ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist to delete.',
	},


	// ----------------------------------
	//         checklist:getAll
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card to get checklists.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'checklist',
				],
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
				operation: [
					'get',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist to get.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'checklist',
				],
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
				operation: [
					'createCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist to update.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'createCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The name of the new check item on the checklist.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'createCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Checked',
				name: 'checked',
				type: 'boolean',
				default: false,
				description: 'Determines whether the check item is already checked when created.',
			},
			{
				displayName: 'Position',
				name: 'pos',
				type: 'string',
				default: '',
				description: 'The position of the checklist on the card. One of: top, bottom, or a positive number.',
			},
		],
	},

	// ----------------------------------
	//         checklist:deleteCheckItem
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'deleteCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.',
	},
	{
		displayName: 'CheckItem ID',
		name: 'checkItemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'deleteCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist item to delete.',
	},

	// ----------------------------------
	//         checklist:getCheckItem
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.',
	},
	{
		displayName: 'CheckItem ID',
		name: 'checkItemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist item to get.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getCheckItem',
				],
				resource: [
					'checklist',
				],
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
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'updateCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card that checklist belongs to.',
	},
	{
		displayName: 'CheckItem ID',
		name: 'checkItemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'updateCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the checklist item to update.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'updateCheckItem',
				],
				resource: [
					'checklist',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name for the checklist item.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{
						name: 'complete',
						value: 'complete',
					},
					{
						name: 'incomplete',
						value: 'incomplete',
					},
				],
				default: 'complete',
				description: 'The resource to operate on.',
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
				description: 'The position of the checklist on the card. One of: top, bottom, or a positive number.',
			},
		],
	},

	// ----------------------------------
	//         checklist:completedCheckItems
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'completedCheckItems',
				],
				resource: [
					'checklist',
				],
			},
		},
		description: 'The ID of the card for checkItems.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'completedCheckItems',
				],
				resource: [
					'checklist',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of: "idCheckItem", "state".',
			},
		],
	},

];
