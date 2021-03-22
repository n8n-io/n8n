import {
	INodeProperties,
} from 'n8n-workflow';

export const callOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'call',
				],
			},
		},
		options: [
			{
				name: 'Make a call',
				value: 'make a call',
				description: 'Voice call',
			},
		],
		default: 'make a call',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const callFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 call: Make a call
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		default: '',
		placeholder: '+14156667777',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'make a call',
				],
				resource: [
					'call',
				],
			},
		},
		description: 'The caller ID for the outbound call',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		placeholder: '+14156667778',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'make a call',
				],
				resource: [
					'call',
				],
			},
		},
		description: 'The phone number to which you wish to make the call to',
	},
	{
		displayName: 'Answer URL',
		name: 'answer_url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'make a call',
				],
				resource: [
					'call',
				],
			},
		},
		description: 'The answer_url should return the XML to handle the call once its answered',
    },
    {
		displayName: 'Answer Method',
		name: 'answer_method',
		type: 'options',
		required: true,
		options: [
            {
                name: 'GET',
                value: 'GET',
            },
            {
                name: 'POST',
                value: 'POST',
            },
        ],
        displayOptions: {
			show: {
				operation: [
					'make a call',
				],
				resource: [
					'call',
				],
			},
		},
        default: 'GET',
		description: 'The answer_url_method, can be either GET or POST',
	},
] as INodeProperties[];