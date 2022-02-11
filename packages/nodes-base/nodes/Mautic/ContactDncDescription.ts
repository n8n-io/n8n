import {
	INodeProperties,
} from 'n8n-workflow';

export const contactDncOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contactDnc',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to Do not Contact',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove contact from Do Not Contact',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactDncFields = [

	/* -------------------------------------------------------------------------- */
	/*                               contactDnc:add                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactDnc',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactDnc',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		options: [
			{
				name: 'E-mail',
				value: 'email',
			},
			{
				name: 'SMS',
				value: 'sms',
			},
		],
		default: 'email',
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactDnc',
				],
				operation: [
					'add',
				],
			},
		},
		options: [
			{
				name: 'Unsubscribed',
				value: '1',
			},
			{
				name: 'Bounced',
				value: '2',
			},
			{
				name: 'Manual',
				value: '3',
			},
		],
		default: '3',
	},
	{
		displayName: 'Comments',
		name: 'comments',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactDnc',
				],
				operation: [
					'add',
				],
			},
		},
		default: 'Unsubscribed via API',
		description: 'A text describing details of DNC entry',
	},
] as INodeProperties[];