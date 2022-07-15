import { INodeProperties } from 'n8n-workflow';

export const streamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a stream',
				action: 'Create a stream',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a stream',
				action: 'Delete a stream',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all streams',
				action: 'Get all streams',
			},
			{
				name: 'Get Subscribed',
				value: 'getSubscribed',
				description: 'Get subscribed streams',
				action: 'Get subscribed streams',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a stream',
				action: 'Update a stream',
			},
		],
		default: 'create',
	},
];

export const streamFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                stream:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: 'JSON format parameters for stream creation',
	},
	{
		displayName: 'Subscriptions',
		name: 'subscriptions',
		type: 'fixedCollection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		required: true,
		description: 'A list of dictionaries containing the the key name and value specifying the name of the stream to subscribe. If the stream does not exist a new stream is created.',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Subscription Properties',
				name: 'properties',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						required: true,
						default: '',
						description: 'Name of Subscription',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						required: true,
						default: '',
						description: 'Description of Subscription',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Announce',
				name: 'announce',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'If announce is True and one of the streams specified in subscriptions has to be created (i.e. doesnt exist to begin with), an announcement will be made notifying that a new stream was created.',
			},
			{
				displayName: 'Authorization Errors Fatal',
				name: 'authorizationErrorsFatal',
				type: 'boolean',
				default: false,
				description: 'Whether authorization errors (such as when the requesting user is not authorized to access a private stream) should be considered fatal or not. When True, an authorization error is reported as such. When set to False, the returned JSON payload indicates that there was an authorization error, but the response is still considered a successful one.',
			},
			{
				displayName: 'History Public to Subscribers',
				name: 'historyPublicToSubscribers',
				type: 'boolean',
				default: false,
				description: 'Whether the streams message history should be available to newly subscribed members, or users can only access messages they actually received while subscribed to the stream',
			},
			{
				displayName: 'Invite Only',
				name: 'inviteOnly',
				type: 'boolean',
				default: false,
				description: 'Whether the streams specified in subscriptions are invite-only or not',
			},
			{
				displayName: 'Principals',
				name: 'principals',
				type: 'fixedCollection',
				default: {},
				description: 'A list of email addresses of the users that will be subscribed/unsubscribed to the streams specified in the subscriptions argument. If not provided, then the requesting user/bot is subscribed.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Principals Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Principal Email',
								name: 'email',
								type: 'string',
								placeholder: 'name@email.com',
								required: true,
								default: '',
								description: 'Principal email address',
							},
						],
					},
				],
			},
			{
				displayName: 'Stream Post Policy',
				name: 'streamPostPolicy',
				type: 'options',
				default: '',
				description: 'Policy for which users can post messages to the stream',
				options: [
					{
						name: '1',
						value: 1,
						description: 'Any user can post',
					},
					{
						name: '2',
						value: 2,
						description: 'Only administrators can post',
					},
					{
						name: '3',
						value: 3,
						description: 'Only new members can post',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                stream:get all                              */
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
					'stream',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include All Active',
				name: 'includeAllActive',
				type: 'boolean',
				default: true,
				description: 'Whether to include all active streams. The user must have administrative privileges to use this parameter.',
			},
			{
				displayName: 'Include Default',
				name: 'includeDefault',
				type: 'boolean',
				default: true,
				description: 'Whether to include all default streams for the users realm',
			},
			{
				displayName: 'Include Owner Subscribed',
				name: 'includeOwnersubscribed',
				type: 'boolean',
				default: true,
				description: 'Whether the user is a bot, include all streams that the bots owner is subscribed to',
			},
			{
				displayName: 'Include Public',
				name: 'includePublic',
				type: 'boolean',
				default: true,
				description: 'Whether to include all public streams',
			},
			{
				displayName: 'Include Subscribed',
				name: 'includeSubscribed',
				type: 'boolean',
				default: true,
				description: 'Whether to include all streams that the user is subscribed to',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                stream:get subscribed                       */
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
					'stream',
				],
				operation: [
					'getSubscribed',
				],
			},
		},
		options: [
			{
				displayName: 'Include Subscribers',
				name: 'includeSubscribers',
				type: 'boolean',
				default: true,
				description: 'Whether each returned stream object should include a subscribers field containing a list of the user IDs of its subscribers',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                stream:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Stream ID',
		name: 'streamId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'ID of stream to update',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},

		description: 'JSON format parameters for stream creation',
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Announcement Only',
				name: 'isAnnouncementOnly',
				type: 'boolean',
				default: false,
				description: 'Whether the stream is limited to announcements',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The new description for the stream',
				placeholder: 'Place of discussion',
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'Whether the stream is a private stream',
			},
			{
				displayName: 'History Public to Subscribers',
				name: 'historyPublicToSubscribers',
				type: 'boolean',
				default: false,
				description: 'Whether the streams message history should be available to newly subscribed members, or users can only access messages they actually received while subscribed to the stream',
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				default: '',
				description: 'The new name for the stream',
				placeholder: 'Italy',
			},
			{
				displayName: 'Stream Post Policy',
				name: 'streamPostPolicy',
				type: 'options',
				default: '',
				description: 'Policy for which users can post messages to the stream',
				options: [
					{
						name: '1',
						value: 1,
						description: 'Any user can post',
					},
					{
						name: '2',
						value: 2,
						description: 'Only administrators can post',
					},
					{
						name: '3',
						value: 3,
						description: 'Only new members can post',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                stream:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Stream ID',
		name: 'streamId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'stream',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'ID of stream to delete',
	},

];
