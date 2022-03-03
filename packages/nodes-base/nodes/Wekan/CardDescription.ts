import {
	INodeProperties,
} from 'n8n-workflow';

export const cardOperations: INodeProperties[] = [
	// ----------------------------------
	//         card
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'card',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new card',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a card',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a card',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all cards',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a card',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const cardFields: INodeProperties[] = [
	// ----------------------------------
	//         card:create
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the board that list belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the list to create card in.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		placeholder: 'My card',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The title of the card.',
	},
	{
		displayName: 'Swimlane ID',
		name: 'swimlaneId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSwimlanes',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The swimlane ID of the new card.',
	},
	{
		displayName: 'Author ID',
		name: 'authorId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The author ID.',
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
					'card',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assignees',
				name: 'assignees',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The new list of assignee IDs attached to the card.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The new description of the card.',
			},
			{
				displayName: 'Members',
				name: 'members',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The new list of member IDs attached to the card.',
			},
		],
	},

	// ----------------------------------
	//         card:delete
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the board that list belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: [
				'boardId',
				'listId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the card to delete.',
	},

	// ----------------------------------
	//         card:get
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the board that list belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the card to get.',
	},

	// ----------------------------------
	//         card:getAll
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the board that list belongs to.',
	},
	{
		displayName: 'From Object',
		name: 'fromObject',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'card',
				],
			},
		},
		options: [
			{
				name: 'List',
				value: 'list',
			},
			{
				name: 'Swimlane',
				value: 'swimlane',
			},
		],
		default: '',
		description: '',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				fromObject: [
					'list',
				],
				operation: [
					'getAll',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Swimlane ID',
		name: 'swimlaneId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSwimlanes',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		displayOptions: {
			show: {
				fromObject: [
					'swimlane',
				],
				operation: [
					'getAll',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the swimlane that card belongs to.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'card',
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
				operation: [
					'getAll',
				],
				resource: [
					'card',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'How many results to return.',
	},

	// ----------------------------------
	//         card:update
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the board that list belongs to.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the list that card belongs to.',
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCards',
			loadOptionsDependsOn: [
				'boardId',
				'listId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'card',
				],
			},
		},
		description: 'The ID of the card to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'card',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Author ID',
				name: 'authorId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'Update the owner of the card.',
			},
			{
				displayName: 'Assignees',
				name: 'assignees',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The new list of assignee IDs attached to the card.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: [
					{
						value: 'white',
						name: 'White',
					},
					{
						value: 'green',
						name: 'Green',
					},
					{
						value: 'yellow',
						name: 'Yellow',
					},
					{
						value: 'orange',
						name: 'Orange',
					},
					{
						value: 'red',
						name: 'Red',
					},
					{
						value: 'purple',
						name: 'Purple',
					},
					{
						value: 'blue',
						name: 'Blue',
					},
					{
						value: 'sky',
						name: 'Sky',
					},
					{
						value: 'lime',
						name: 'Lime',
					},
					{
						value: 'pink',
						name: 'Pink',
					},
					{
						value: 'black',
						name: 'Black',
					},
					{
						value: 'silver',
						name: 'Silver',
					},
					{
						value: 'peachpuff',
						name: 'Peachpuff',
					},
					{
						value: 'crimson',
						name: 'Crimson',
					},
					{
						value: 'plum',
						name: 'Plum',
					},
					{
						value: 'darkgreen',
						name: 'Darkgreen',
					},
					{
						value: 'slateblue',
						name: 'Slateblue',
					},
					{
						value: 'magenta',
						name: 'Magenta',
					},
					{
						value: 'gold',
						name: 'Gold',
					},
					{
						value: 'navy',
						name: 'Navy',
					},
					{
						value: 'gray',
						name: 'Gray',
					},
					{
						value: 'saddlebrown',
						name: 'Saddlebrown',
					},
					{
						value: 'paleturquoise',
						name: 'Paleturquoise',
					},
					{
						value: 'mistyrose',
						name: 'Mistyrose',
					},
					{
						value: 'indigo',
						name: 'Indigo',
					},
				],
				default: '',
				description: 'The new color of the card.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The new description of the card.',
			},
			{
				displayName: 'Due At',
				name: 'dueAt',
				type: 'dateTime',
				default: '',
				description: 'The new due at field of the card.',
			},
			{
				displayName: 'End At',
				name: 'endAt',
				type: 'dateTime',
				default: '',
				description: 'The new end at field of the card.',
			},
			{
				displayName: 'Label IDs',
				name: 'labelIds',
				type: 'string',
				default: '',
				description: 'The label IDs attached to the card.',
			},
			{
				displayName: 'List ID',
				name: 'listId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLists',
					loadOptionsDependsOn: [
						'boardId',
					],
				},
				default: '',
				description: 'The new list ID of the card (move operation).',
			},
			{
				displayName: 'Members',
				name: 'members',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The new list of member IDs attached to the card.',
			},
			{
				displayName: 'Over Time',
				name: 'isOverTime',
				type: 'boolean',
				default: false,
				description: 'The new over time field of the card.',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCards',
					loadOptionsDependsOn: [
						'boardId',
						'listId',
					],
				},
				default: '',
				description: 'The parent of the card.',
			},
			{
				displayName: 'Received At',
				name: 'receivedAt',
				type: 'dateTime',
				default: '',
				description: 'The new received at field of the card.',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'number',
				default: 0,
				description: 'The internally used sort value of a card.',
			},
			{
				displayName: 'Spent Time',
				name: 'spentTime',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: '',
				description: 'The new spent time field of the card.',
			},
			{
				displayName: 'Start At',
				name: 'startAt',
				type: 'dateTime',
				default: '',
				description: 'The new start at field of the card.',
			},
			{
				displayName: 'Swimlane ID',
				name: 'swimlaneId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSwimlanes',
					loadOptionsDependsOn: [
						'boardId',
					],
				},
				default: '',
				description: 'The new swimlane ID of the card.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The new title of the card.',
			},
		],
	},
];
