import {
	INodeProperties,
} from 'n8n-workflow';
import { text } from 'express';

export const userProfileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'userProfile',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: `Get your user's profile`,
			},
			{
				name: 'Update',
				value: 'update',
				description: `Update user's profile`,
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const userProfileFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                userProfile:update                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userProfile',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldUi',
				placeholder: 'Add Custom Fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customFieldValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'id',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getTeamFields',
								},
								default: '',
								description: 'ID of the field to set.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set.',
							},
							{
								displayName: 'Alt',
								name: 'alt',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: `This field can only be changed by admins for users on paid teams.`,
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status Emoji',
				name: 'status_emoji',
				type: 'string',
				default: '',
				description: `is a string referencing an emoji enabled for the Slack team, such as :mountain_railway:`,
			},
			{
				displayName: 'Status Expiration',
				name: 'status_expiration',
				type: 'dateTime',
				default: '',
				description: `is an integer specifying seconds since the epoch, more commonly known as "UNIX time". Providing 0 or omitting this field results in a custom status that will not expire`,
			},
			{
				displayName: 'Status Text',
				name: 'status_text',
				type: 'string',
				default: '',
				description: `allows up to 100 characters, though we strongly encourage brevity.`,
			},
			{
				displayName: 'User ID',
				name: 'user',
				type: 'string',
				default: '',
				description: `ID of user to change. This argument may only be specified by team admins on paid teams.`,
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                userProfile:get                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userProfile',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Include Labels',
				name: 'include_labels',
				type: 'boolean',
				default: false,
				description: `Include labels for each ID in custom profile fields`,
			},
			{
				displayName: 'User ID',
				name: 'user',
				type: 'string',
				default: '',
				description: `User to retrieve profile info for`,
			},
		],
	},
];
