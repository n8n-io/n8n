import { INodeProperties } from 'n8n-workflow';

export const logOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['log']
			}
		},
		options: [
			{ name: 'Get All', value: 'getAll', description: 'Get all task logs' },
			{ name: 'Get', value: 'get', description: 'Get a single log' },
			{ name: 'Create', value: 'create', description: 'Create task log' },
			{
				name: 'Execute a responder',
				value: 'executeResponder',
				description: 'Execute a responder on a selected log'
            },
        ],
	}
] as INodeProperties[];

export const logFields = [
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
					'log',
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
					'log',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	// required attributs
	{
		displayName: 'Log Id',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['log'], operation: ['executeResponder', 'get'] }
		}
	},
	{
		displayName: 'Task Id',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['log'], operation: ['create', 'getAll'] }
		}
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['log'], operation: ['create'] } }
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['log'], operation: ['create'] } }
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Ok', value: 'Ok' },
			{ name: 'Deleted', value: 'Deleted' }
		],
		default: '',
		required: true,
		displayOptions: { show: { resource: ['log'], operation: ['create'] } }
	},
	// required for responder execution
	{
		displayName: 'Responders',
		name: 'responders',
		type: 'multiOptions',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsDependsOn: ['id'],
			loadOptionsMethod: 'loadResponders'
		},
		displayOptions: {
			show: { resource: ['log'], operation: ['executeResponder'] },
			hide: { id: [''] }
		}
	},
	// Optional attributs
	{
        displayName: 'Optional Attribut',
		name: 'optionals',
		type: 'fixedCollection',
		default: {},
		displayOptions: { show: { resource: ['log'], operation: ['create'] } },
		description: 'adding attachment is optional',
		placeholder: 'Add attachement',
		options: [
            {
                displayName: 'Attachement',
                name: 'attachement',
                values: [
                    {
                        displayName: 'Binary Property',
                        name: 'binaryProperty',
                        type: 'string',
                        default: 'data',
                        description: '',
                    },
                    
                ],
            },
		]
	}
] as INodeProperties[];
