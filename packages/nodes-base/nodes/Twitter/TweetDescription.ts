import {
	INodeProperties,
} from 'n8n-workflow';

export const tweetOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'tweet',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new tweet',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const tweetFields = [
/* -------------------------------------------------------------------------- */
/*                                tweet:create                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'tweet',
				],
			},
		},
		description: 'The text of the status update. URL encode as necessary. t.co link wrapping will affect character counts.	',
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
					'tweet',
				],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				placeholder: 'Add Attachments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attachment',
						displayName: 'Attachment',
						values: [
							{
								displayName: 'Binary Property',
								name: 'binaryPropertyName',
								type: 'string',
								default: 'data',
								description: 'Name of the binary properties which contain data which should be added to tweet as attachment',
							},
							{
								displayName: 'Category',
								name: 'category',
								type: 'options',
								options: [
									{
										name: 'Amplify Video',
										value: 'amplifyVideo',
									},
									{
										name: 'Gif',
										value: 'tweetGif',
									},
									{
										name: 'Image',
										value: 'tweetImage',
									},
									{
										name: 'Video',
										value: 'tweetVideo',
									},
								],
								default: '',
								description: 'The category that represents how the media will be used',
							},
						],
					},
				],
				default: '',
				description: 'Array of supported attachments to add to the message.',
			},
			{
				displayName: 'Display Coordinates',
				name: 'displayCoordinates',
				type: 'boolean',
				default: false,
				description: 'Whether or not to put a pin on the exact coordinates a Tweet has been sent from.',
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
								description: 'The location latitude.',
								default: '',
							},
							{
								displayName: 'Longitude',
								name: 'longitude',
								type: 'string',
								required: true,
								description: 'The location longitude.',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Possibly Sensitive',
				name: 'possiblySensitive',
				type: 'boolean',
				default: false,
				description: 'If you upload Tweet media that might be considered sensitive content such as nudity, or medical procedures, you must set this value to true.',
			},
		]
	},
] as INodeProperties[];
