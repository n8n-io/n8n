import {
	INodeProperties,
 } from 'n8n-workflow';

export const messageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Approve',
				value: 'approve',
				description: 'Approve a message.',
			},
			{
				name: 'Schedule',
				value: 'schedule',
				description: 'Schedules a message to send on one or more social profiles ',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message',
			},
			{
				name: 'Get Outbound',
				value: 'getOutbound',
				description: 'Get autbound messages',
			},
			{
				name: 'Reject',
				value: 'reject',
				description: 'Reject a message',
			},
		],
		default: 'approve',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageFields = [
/* -------------------------------------------------------------------------- */
/*                                 message:approve                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'approve',
				],
				resource: [
					'message',
				],
			},
		},
		default: '',
		description: 'The message ID.',
	},
	{
		displayName: 'Sequence Number',
		name: 'sequenceNumber',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'approve',
				],
				resource: [
					'message',
				],
			},
		},
		default: '',
		description: 'The sequence number of the message being approved.',
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
					'approve',
				],
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				displayName: 'Reviewer Type',
				name: 'reviewerType',
				type: 'options',
				options: [
					{
						name: 'External',
						value: 'external',
					},
					{
						name: 'Member',
						value: 'member',
					},
				],
				default: 'external',
				description: 'The actor that will be approving the message',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 message:schedule                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'schedule',
				],
			},
		},
		default: '',
		description: 'The message text to publish.',
	},
	{
		displayName: 'Social Profile IDs',
		name: 'socialProfileIds',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSocialProfiles',
		},
		displayOptions: {
			show: {
				operation: [
					'schedule',
				],
				resource: [
					'message',
				],
			},
		},
		default: [],
		description: 'The social profiles that the message will be posted to.',
	},
	{
		displayName: 'Scheduled Send Time',
		name: 'scheduledSendTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'schedule',
				],
				resource: [
					'message',
				],
			},
		},
		default: '',
		description: `The time the message is scheduled to be sent in UTC time, ISO-8601 format. <br/>
		Missing or different timezones will not be accepted,<br/>
		to ensure there is no ambiguity about scheduled time.`,
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
					'schedule',
				],
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				displayName: 'Email Notification',
				name: 'emailNotification',
				type: 'boolean',
				default: false,
				description: 'A flag to determine whether email notifications are sent when the message is published.',
			},
			{
				displayName: 'Facebook Visibility',
				name: 'facebookVisibility',
				type: 'multiOptions',
				options: [
					{
						name: 'Everyone',
						value: 'everyone',
					},
					{
						name: 'Friends',
						value: 'friends',
					},
					{
						name: 'Friends Of Friends',
						value: 'friendsOfFriends',
					},
				],
				default: '',
				description: 'Facebook visibility rules. At most 1 can be used.',
			},
			{
				displayName: 'LinkedIn Visibility',
				name: 'linkedInVisibility',
				type: 'multiOptions',
				options: [
					{
						name: 'Anyone',
						value: 'anyone',
					},
					{
						name: 'ConnectionsOnly',
						value: 'connectionsOnly',
					},
				],
				default: '',
				description: 'LinkedIn visibility rules. At most 1 can be used.',
			},
			{
				displayName: 'Location',
				name: 'locationFieldsUi',
				type: 'fixedCollection',
				placeholder: 'Add Location',
				default: {},
				description: `Subscriber location information.n`,
				options: [
					{
						name: 'locationFieldsValues',
						displayName: 'Location',
						values: [
							{
								displayName: 'Latitude',
								name: 'latitude',
								type: 'string',
								required: true,
								default: '',
								description: 'The latitude in decimal degrees. Must be between -90 to 90.',
							},
							{
								displayName: 'Longitude',
								name: 'longitude',
								type: 'string',
								required: true,
								default: '',
								description: 'The longitude in decimal degrees. Must be between -180 to 180.',
							},
						],
					}
				],
			},
			{
				displayName: 'Media',
				name: 'mediaUi',
				placeholder: 'Add Media',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The media to attach to the message',
				options: [
					{
						name: 'mediaValues',
						displayName: 'Media',
						values: [
							{
								displayName: 'ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'The media ID.',
							},
							{
								displayName: 'Video Options',
								name: 'videoOptions',
								placeholder: 'Add Video Option',
								type: 'collection',
								default: '',
								typeOptions: {
									multipleValues: false,
								},
								description: 'The media to attach to the message',
								options: [
									{
										displayName: 'Facebook',
										name: 'facebookUi',
										placeholder: 'Add Facebook Video Options',
										type: 'fixedCollection',
										default: '',
										typeOptions: {
											multipleValues: false,
										},
										description: 'Facebook video metadata. Optional.',
										options: [
											{
												name: 'facebookValues',
												displayName: 'Video Options',
												values: [
													{
														displayName: 'Title',
														name: 'title',
														type: 'string',
														default: '',
														description: 'The video title',
													},
													{
														displayName: 'Category',
														name: 'category',
														type: 'options',
														options: [
															{
																name: 'Beauty Fashion',
																value: 'beautyFashion',
															},
															{
																name: 'Business',
																value: 'business',
															},
															{
																name: 'Cars Trucks',
																value: 'CarsTrucks',
															},
															{
																name: 'Comedy',
																value: 'comedy',
															},
															{
																name: 'Cute Animals',
																value: 'cuteAnimals',
															},
															{
																name: 'Entertaiment',
																value: 'entertaiment',
															},
															{
																name: 'Family',
																value: 'family',
															},
															{
																name: 'Food Health',
																value: 'foodHealth',
															},
															{
																name: 'Home',
																value: 'home',
															},
															{
																name: 'Life Style',
																value: 'lifeStyle',
															},
															{
																name: 'Music',
																value: 'music',
															},
															{
																name: 'News',
																value: 'news',
															},
															{
																name: 'Politics',
																value: 'politics',
															},
															{
																name: 'Science',
																value: 'science',
															},
															{
																name: 'Sports',
																value: 'sports',
															},
															{
																name: 'Technology',
																value: 'technology',
															},
															{
																name: 'Video Gaming',
																value: 'videoGaming',
															},
															{
																name: 'Other',
																value: 'other',
															},
														],
														default: '',
														description: 'The video category',
													},
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Media URLs',
				name: 'mediaUrls',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description: 'The ow.ly media to attach to the message',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'The Hootsuite message tags to apply to the message.',
			},
			{
				displayName: 'Webhook URLs',
				name: 'webhookUrls',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description: `The webhook URL(s) to call to when the message’s state changes.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 message:delete                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'message',
				],
			},
		},
		default: '',
		description: 'The message ID.',
	},
/* -------------------------------------------------------------------------- */
/*                                 message:get                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'message',
				],
			},
		},
		default: '',
		description: 'The message ID.',
	},
/* -------------------------------------------------------------------------- */
/*                                 message:getOutbound                        */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getOutbound',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			maxValue: 100,
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getOutbound',
				],
				returnAll: [
					false,
				],
			},
		}
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getOutbound',
				],
			},
		},
		default: '',
		description: 'The start date range of messages to be returned. In ISO-8601 format.',
	},
	{
		displayName: 'End Time',
		name: 'endTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getOutbound',
				],
			},
		},
		default: '',
		description: 'The end date range of messages to be returned. In ISO-8601 format. Must not be later than 4 weeks from startTime.',
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
					'getOutbound',
				],
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{
						name: 'Peding Approval',
						value: 'pendingAproval'
					},
					{
						name: 'Rejected',
						value: 'rejected'
					},
					{
						name: 'Sent',
						value: 'sent'
					},
					{
						name: 'Scheduled',
						value: 'scheduled'
					},
					{
						name: 'Send Failed Permanently',
						value: 'sendFailedPermanently'
					},
				],
				default: '',
				description: 'A filter to return messages with in the matching state.',
			},
			{
				displayName: 'Social Profile IDs',
				name: 'socialProfileIds',
				type: 'multiOptions',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getSocialProfiles',
				},
				default: [],
				description: 'The social profiles that the message will be posted to.',
			},
			{
				displayName: 'Include Unscheduled Review Msgs',
				name: 'includeUnscheduledReviewMsgs',
				type: 'boolean',
				default: false,
				description: 'Flag to retrieve unscheduled (Send Now) review messages on top of scheduled ones retrieved from time range query.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 message:reject                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'reject',
				],
				resource: [
					'message',
				],
			},
		},
		default: '',
		description: 'The message ID.',
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: [
					'reject',
				],
				resource: [
					'message',
				],
			},
		},
		default: '',
		description: 'The rejection reason to be displayed to the creator of the message.',
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
					'reject',
				],
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				displayName: 'Reviewer Type',
				name: 'reviewerType',
				type: 'options',
				options: [
					{
						name: 'External',
						value: 'external',
					},
					{
						name: 'Member',
						value: 'member',
					},
				],
				default: 'external',
				description: 'The actor that will be approving the message',
			},
		],
	},
] as INodeProperties[];
