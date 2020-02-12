import { INodeProperties } from "n8n-workflow";

export const leadOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a lead',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all leads',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update new lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
			}
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const leadFields = [

/* -------------------------------------------------------------------------- */
/*                                 lead:create                                */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				],
			},
		},
		description: `User's last name`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'lead',
				],
			},
		},
		options: [
			{
				displayName: 'Avatar',
				name: 'avatar',
				type: 'string',
				default: '',
				description: 'An avatar image URL. note: the image url needs to be https.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the user',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the user',
			},
			{
				displayName: 'Unsubscribed From Emails',
				name: 'unsubscribedFromEmails',
				type: 'boolean',
				default: false,
				description: 'Whether the Lead is unsubscribed from emails',
			},
			{
				displayName: 'Update Last Request At',
				name: 'updateLastRequestAt',
				type: 'boolean',
				default: false,
				description: 'A boolean value, which if true, instructs Intercom to update the<br />users last_request_at value to the current API service time in<br />UTC. default value if not sent is false.',
			},
			{
				displayName: 'Companies',
				name: 'companies',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				description: 'Identifies the companies this user belongs to.',
			},
			{
				displayName: 'UTM Source',
				name: 'utmSource',
				type: 'string',
				default: '',
				description: 'An avatar image URL. note: the image url needs to be https.',
			},
			{
				displayName: 'UTM Medium',
				name: 'utmMedium',
				type: 'string',
				default: '',
				description: 'Identifies what type of link was used',
			},
			{
				displayName: 'UTM Campaign',
				name: 'utmCampaign',
				type: 'string',
				default: '',
				description: 'Identifies a specific product promotion or strategic campaign',
			},
			{
				displayName: 'UTM Term',
				name: 'utmTerm',
				type: 'string',
				default: '',
				description: 'Identifies search terms',
			},
			{
				displayName: 'UTM Content',
				name: 'utmContent',
				type: 'string',
				default: '',
				description: 'Identifies what specifically was clicked to bring the user to the site',
			},
		]
	},

] as INodeProperties[];
