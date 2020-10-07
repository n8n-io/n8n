import { INodeProperties } from 'n8n-workflow';

export const syncOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'sync',
				],
			},
		},
		options: [
			{
				name: 'Get updates',
				value: 'get',
				description: 'Get updates from the server',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];


export const syncFields = [

/* -------------------------------------------------------------------------- */
/*                                  sync get                                  */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Full state',
        name: 'fullState',
        type: 'boolean',
        default: true,
        displayOptions: {
            show: {
                operation: [
                    'get',
                ],
                resource: [
                    'sync',
                ],
            },
        },
        required: true,
        description: 'Controls whether to include the full state for all rooms the user is a member of.',
    },
    {
        displayName: 'Since hash',
        name: 'since',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                operation: [
                    'get',
                ],
                resource: [
                    'sync',
                ],
                fullState: [
                    false,
                ]
            },
        },
        description: 'A point in time to continue a sync from.',
    },
    {
        displayName: 'Filter',
        name: 'filter',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                operation: [
                    'get',
                ],
                resource: [
                    'sync',
                ],
            },
        },
        description: 'The ID of a filter created using the filter API or a filter JSON object encoded as a string.',
    },
] as INodeProperties[];