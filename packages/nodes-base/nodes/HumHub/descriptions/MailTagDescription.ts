import {
	INodeProperties,
} from 'n8n-workflow';

import {
    getPagingParameters
} from '../GenericFunctions';

export const mailTagOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mailTag',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find tags of the conversation',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update tags',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  mailTagFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 mailTag:getAll                             */
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
					'mailTag',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The id of conversation.',
	},

    ...getPagingParameters('mailTag'),

	/* -------------------------------------------------------------------------- */
	/*                                 mailTag:update		             		  */
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
					'mailTag',
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
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'mailTag',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Conversation tags separated by comma. Example: Work,Travel',
	},

] as INodeProperties[];
