import {
	INodeProperties,
} from 'n8n-workflow';

export const campaignContactOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'campaignContact',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to a campaign',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove contact from a campaign',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const campaignContactFields = [

	/* -------------------------------------------------------------------------- */
	/*                               campaignContact:add                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'campaignContact',
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

		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'campaignContact',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		default: '',
		description: 'Campaign ID',

	},
] as INodeProperties[];
