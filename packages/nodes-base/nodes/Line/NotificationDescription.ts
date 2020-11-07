import {
	INodeProperties,
 } from 'n8n-workflow';

export const notificationOperations = [
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
] as INodeProperties[];

export const notificationFields = [

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
				displayName: 'Image File',
				name: 'imageFile',
				type: 'string',
				default: 'data',
				description: `Name of the property that holds the binary data.<br>
				If you specified imageThumbnail ,imageFullsize and imageFile, imageFile takes precedence.`,
			},
			{
				displayName: 'Image Full Size',
				name: 'imageFullsize',
				type: 'string',
				default: '',
				description: 'HTTP/HTTPS URL. Maximum size of 2048×2048px JPEG',
			},
			{
				displayName: 'Image Thumbnail',
				name: 'imageThumbnail',
				type: 'string',
				default: '',
				description: 'HTTP/HTTPS URL. Maximum size of 240×240px JPEG',
			},
			{
				displayName: 'Notification Disabled',
				name: 'notificationDisabled',
				type: 'boolean',
				default: false,
				description: `true: The user doesn't receive a push notification when the message is sent.<br>
				false: The user receives a push notification when the message is sent`,
			},
			{
				displayName: 'Sticker ID',
				name: 'stickerId',
				type: 'number',
				default: '',
				description: 'Package ID',
			},
			{
				displayName: 'Sticker Package ID',
				name: 'stickerPackageId',
				type: 'number',
				default: '',
				description: 'Package ID. <a href="https://developers.line.biz/media/messaging-api/sticker_list.pdf" target="_blank">Sticker List</a>',
			},
		],
	},
] as INodeProperties[];
