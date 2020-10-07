import { INodeProperties } from 'n8n-workflow';

export const eventOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Get a single event',
				value: 'get',
				description: 'Get information about an event',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];


export const eventFields = [

/* -------------------------------------------------------------------------- */
/*                              event get by id                               */
/* -------------------------------------------------------------------------- */
    
        
    {
        displayName: 'Room ID',
        name: 'roomId',
        type: 'string',
        default: '',
        placeholder: '!123abc:matrix.org',
        displayOptions: {
            show: {
                operation: [
                    'get',
                ],
                resource: [
                    'event',
                ],
            },
        },
        required: true,
        description: 'The room related to the event',
    },
       
    {
        displayName: 'Event ID',
        name: 'eventId',
        type: 'string',
        default: '',
        placeholder: '$1234abcd:matrix.org',
        displayOptions: {
            show: {
                operation: [
                    'get',
                ],
                resource: [
                    'event',
                ],
            },
        },
        required: true,
        description: 'The room related to the event',
    },
] as INodeProperties[];