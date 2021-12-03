import {
	INodeProperties,
} from 'n8n-workflow';

export const mailRecipientOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mailRecipient',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find recipients of the conversation',
			},
			{
				name: 'Add',
				value: 'add',
				description: 'Add recipient to conversation',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove recipient from conversation',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  mailRecipientFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 mailRecipient:getAll                       */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'Message ID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailRecipient',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 mailRecipient:add                       */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'Message ID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailRecipient',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},
    {
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailRecipient',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'The id of user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 mailRecipient:remove                    */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailRecipient',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},
    {
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailRecipient',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'The id of user.',
	},

] as INodeProperties[];
