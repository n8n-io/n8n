import { INodeProperties } from 'n8n-workflow';

export const labelOperations: INodeProperties[] = [
	// ----------------------------------
	//         label
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['label'],
			},
		},
		options: [
			{
				name: 'Add to Card',
				value: 'addLabel',
				description: 'Add a label to a card',
				action: 'Add a label to a card',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new label',
				action: 'Create a label',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a label',
				action: 'Delete a label',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a label',
				action: 'Get a label',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all labels for the board',
				action: 'Get all labels',
			},
			{
				name: 'Remove From Card',
				value: 'removeLabel',
				description: 'Remove a label from a card',
				action: 'Remove a label from a card',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a label',
				action: 'Update a label',
			},
		],
		default: 'getAll',
	},
];

export const labelFields: INodeProperties[] = [
	{
		displayName: 'Board',
		name: 'boardIdLabelRLC',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'getAll'],
				resource: ['label'],
				'@version': [2],
			},
		},
		description: 'The ID of the board',
		modes: [
			// TODO: This rule should only apply for direct node properties, not their children
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				hint: 'Select a board from the list',
				placeholder: 'Choose...',
				initType: 'board',
				typeOptions: {
					searchListMethod: 'searchBoards',
					searchFilterRequired: true,
					searchable: true,
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				hint: 'Enter board URL',
				placeholder: 'https://trello.com/b/e123456/board-name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://trello.com/b/([a-zA-Z0-9]{2,})/.*',
							errorMessage:
								'URL has to be in the format: http(s)://trello.com/b/[board ID]/.*',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://trello.com/b/([a-zA-Z0-9]{2,})',
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter Board Id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Id value must be alphanumeric and at least 2 characters',
						},
					},
				],
				placeholder: 'KdEAAdde',
				url: '=https://trello.com/b/{{$value}}',
			},
		],
	},


	// ----------------------------------
	//         label:create
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['label'],
				'@version': [1],
			},
		},
		description: 'The ID of the board to create the label on',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['label'],
			},
		},
		description: 'Name for the label',
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['label'],
			},
		},
		options: [
			{
				name: 'Black',
				value: 'black',
			},
			{
				name: 'Blue',
				value: 'blue',
			},
			{
				name: 'Green',
				value: 'green',
			},
			{
				name: 'Lime',
				value: 'lime',
			},
			{
				name: 'Null',
				value: 'null',
			},
			{
				name: 'Orange',
				value: 'orange',
			},
			{
				name: 'Pink',
				value: 'pink',
			},
			{
				name: 'Purple',
				value: 'purple',
			},
			{
				name: 'Red',
				value: 'red',
			},
			{
				name: 'Sky',
				value: 'sky',
			},
			{
				name: 'Yellow',
				value: 'yellow',
			},
		],
		default: 'null',
		description: 'The color for the label',
	},

	// ----------------------------------
	//         label:delete
	// ----------------------------------
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to delete',
	},

	// ----------------------------------
	//         label:getAll
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['label'],
				'@version': [1],
			},
		},
		description: 'The ID of the board to get label',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['label'],
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
	//         label:get
	// ----------------------------------
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['label'],
			},
		},
		description: 'Get information about a label by ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['label'],
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

	{
		displayName: 'Card ID',
		name: 'cardIdLabelRLC',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				hint: 'Select a card from the list',
				placeholder: 'Choose...',
				typeOptions: {
					searchListMethod: 'searchCards',
					searchFilterRequired: true,
					searchable: true,
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				hint: 'Enter Card URL',
				placeholder: 'https://trello.com/c/e123456/card-name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://trello.com/c/([a-zA-Z0-9]{2,})/.*',
							errorMessage:
								'URL has to be in the format: http(s)://trello.com/c/[card ID]/.*',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://trello.com/c/([a-zA-Z0-9]{2,})',
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter Card Id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Id value must be alphanumeric and at least 2 characters',
						},
					},
				],
				placeholder: 'wiIaGwqE',
				url: '=https://trello.com/c/{{$value}}',
			},
		],
		displayOptions: {
			show: {
				operation: ['addLabel', 'removeLabel'],
				resource: ['label'],
				'@version': [2],
			},
		},
		description: 'The ID of the card',
	},

	// ----------------------------------
	//         label:addLabel
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['addLabel'],
				resource: ['label'],
				'@version': [1],
			},
		},
		description: 'The ID of the card to get label',
	},
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['addLabel'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to add',
	},

	// ----------------------------------
	//         label:removeLabel
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['removeLabel'],
				resource: ['label'],
			},
		},
		description: 'The ID of the card to remove label from',
	},
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['removeLabel'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to remove',
	},

	// ----------------------------------
	//         label:update
	// ----------------------------------
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['label'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the label',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: [
					{
						name: 'Black',
						value: 'black',
					},
					{
						name: 'Blue',
						value: 'blue',
					},
					{
						name: 'Green',
						value: 'green',
					},
					{
						name: 'Lime',
						value: 'lime',
					},
					{
						name: 'Null',
						value: 'null',
					},
					{
						name: 'Orange',
						value: 'orange',
					},
					{
						name: 'Pink',
						value: 'pink',
					},
					{
						name: 'Purple',
						value: 'purple',
					},
					{
						name: 'Red',
						value: 'red',
					},
					{
						name: 'Sky',
						value: 'sky',
					},
					{
						name: 'Yellow',
						value: 'yellow',
					},
				],
				default: 'null',
				description: 'The color for the label',
			},
		],
	},
];
