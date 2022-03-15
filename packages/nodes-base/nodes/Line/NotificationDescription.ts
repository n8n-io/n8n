import {
	INodeProperties,
} from 'n8n-workflow';

export const notificationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'notification',
				],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Sends notifications to users or groups',
			},
		],
		default: 'send',
		description: 'The operation to perform.',
	},
];

export const notificationFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 notification:send                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message',
		name: 'message',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'send',
				],
				resource: [
					'notification',
				],
			},
		},
		default: '',
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
					'send',
				],
				resource: [
					'notification',
				],
			},
		},
		options: [
			{
				displayName: 'Image',
				name: 'imageUi',
				placeholder: 'Add Image',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'imageValue',
						displayName: 'image',
						values: [
							{
								displayName: 'Binary Data',
								name: 'binaryData',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Image Full Size',
								name: 'imageFullsize',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										binaryData: [
											false,
										],
									},
								},
								description: 'HTTP/HTTPS URL. Maximum size of 2048×2048px JPEG',
							},
							{
								displayName: 'Image Thumbnail',
								name: 'imageThumbnail',
								type: 'string',
								displayOptions: {
									show: {
										binaryData: [
											false,
										],
									},
								},
								default: '',
								description: 'HTTP/HTTPS URL. Maximum size of 240×240px JPEG',
							},
							{
								displayName: 'Binary Property',
								name: 'binaryProperty',
								type: 'string',
								displayOptions: {
									show: {
										binaryData: [
											true,
										],
									},
								},
								default: 'data',
								description: `Name of the property that holds the binary data.`,
							},
						],
					},
				],
			},
			{
				displayName: 'Notification Disabled',
				name: 'notificationDisabled',
				type: 'boolean',
				default: false,
				description: `<p>true: The user doesn't receive a push notification when the message is sent.</p><p>false: The user receives a push notification when the message is sent</p>`,
			},
			{
				displayName: 'Sticker',
				name: 'stickerUi',
				placeholder: 'Add Sticker',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'stickerValue',
						displayName: 'Sticker',
						values: [
							{
								displayName: 'Sticker ID',
								name: 'stickerId',
								type: 'number',
								default: '',
								description: 'Sticker ID',
							},
							{
								displayName: 'Sticker Package ID',
								name: 'stickerPackageId',
								type: 'number',
								default: '',
								description: 'Package ID',
							},
						],
					},
				],
			},
		],
	},
];
