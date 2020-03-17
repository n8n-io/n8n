import { INodeProperties } from "n8n-workflow";

export const mailboxOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mailbox',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a mailbox',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all mailboxes',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const mailboxFields = [

/* -------------------------------------------------------------------------- */
/*                                mailbox:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Mailbox ID',
		name: 'mailboxId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'mailbox',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
