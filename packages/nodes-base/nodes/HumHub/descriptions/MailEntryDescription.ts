import {
	INodeProperties,
} from 'n8n-workflow';

import {
    getPagingParameters
} from '../GenericFunctions';

export const mailEntryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all conversations',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create conversation',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get conversation by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete entry',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  mailEntryFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 mailEntry:getAll                           */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'MessageID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},
    ...getPagingParameters('mailEntry'),

	/* -------------------------------------------------------------------------- */
	/*                                 mailEntry:create                           */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'MessageID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Conversation entry content.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 mailEntry:get                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'MessageID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of entry.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 mailEntry:update                           */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'MessageID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The id of entry.',
	},
    {
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Conversation entry content.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 mailEntry:delete                           */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'MessageID',
		name: 'messageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'mailEntry',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of entry.',
	},

] as INodeProperties[];
