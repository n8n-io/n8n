import {
	INodeProperties,
} from 'n8n-workflow';

export const smsAdvancedOptions = [
	{
		displayName: 'Advanced',
		name: 'advancedOptions',
		type: 'collection',
			displayOptions: {
			show: {
				resource: [
					'sms',
				],
				operation: [
					'send',
				],
			},
		},
		default: {},
		description:'Advanced SMS Options',
		options: [
			{
				displayName: 'Schedule Message At',
				name: 'sendAt',
				type: 'dateTime',
				default: '',
				description:'Date and time when the message is to be sent. Used for scheduled SMS. Has the following format: yyyy-MM-dd\'T\'HH:mm:ss.SSSZ',
			},
			{
				displayName: 'Notification Callback URL',
				name: 'notifyUrl',
				type: 'string',
				default: '',
				description:'The URL on your call back server on to which a delivery report will be sent',
			},
			{
				displayName: 'Additional Callback Data',
				name: 'callbackData',
				type: 'string',
				default: '',
				description:'Additional client data to be sent over the notifyUrl, in JSON. The maximum value is 4000 characters.',
			},
			{
				displayName: 'Transliteration',
				name: 'transliteration',
				type: 'options',
				default: 'NON_UNICODE',
				description:'The transliteration of your sent message from one script to another. Transliteration is used to replace characters which are not recognized as part of your defaulted alphabet',
				options: [
					{
						name: 'TURKISH',
						value: 'TURKISH',
					},
					{
						name: 'GREEK',
						value: 'GREEK',
					},
					{
						name: 'CYRILLIC',
						value: 'CYRILLIC',
					},
					{
						name: 'SERBIAN_CYRILLIC',
						value: 'SERBIAN_CYRILLIC',
					},
					{
						name: 'CENTRAL_EUROPEAN',
						value: 'CENTRAL_EUROPEAN',
					},
					{
						name: 'BALTIC',
						value: 'BALTIC',
					},
					{
						name: 'NON_UNICODE',
						value: 'NON_UNICODE',
					},
				],
			},
			{
				displayName: 'Delivery Days',
				name: 'deliveryTimeWindowDays',
				type: 'multiOptions',
				default: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
				description:'Days of the week which are included in the delivery time window. At least one day must be provided. Separate multiple days with a comma',
				options: [
					{
						name: 'Monday',
						value: 'MONDAY',
					},
					{
						name: 'Tuesday',
						value: 'TUESDAY',
					},
					{
						name: 'Wednesday',
						value: 'WEDNESDAY',
					},
					{
						name: 'Thursday',
						value: 'THURSDAY',
					},
					{
						name: 'Friday',
						value: 'FRIDAY',
					},
					{
						name: 'Saturday',
						value: 'SATURDAY',
					},
					{
						name: 'Sunday',
						value: 'SUNDAY',
					},
				],
			},
			{
				displayName: 'Delivery Hours From',
				name: 'deliveryTimeWindowFrom',
				type: 'string',
				default: '',
				description:'The exact time of day to start sending messages, in HH:mm format. Time is expressed in the UTC time zone. If set, use it together with the "Delivery Hours To" property with minimum 1 hour difference. Requires setting "Delivery Days"',
			},
			{
				displayName: 'Delivery Hours To',
				name: 'deliveryTimeWindowTo',
				type: 'string',
				default: '',
				description:'The exact time of day to end sending messages, in HH:mm format. Time is expressed in the UTC time zone. If set, use it together with the "Delivery Hours From" property with minimum 1 hour difference. Requires setting "Delivery Days"',
			},
		],
	},
] as INodeProperties[];
