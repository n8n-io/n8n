import type { INodeProperties } from 'n8n-workflow';

const toFieldProperties: INodeProperties = {
	displayName: 'To',
	name: 'to',
	type: 'string',
	default: '',
	placeholder: '+14155238886',
	required: true,
	displayOptions: {
		show: {
			operation: ['send'],
			resource: ['sms'],
		},
	},
	description: 'The number to which to send the message',
};

const smsReusableToOptions: INodeProperties[] = [
	{
		...toFieldProperties,
		displayName: 'To - Main Phone',
	},
	{
		...toFieldProperties,
		displayName: 'To - Fallback Phone',
		name: 'fallbackPhone',
		required: false,
		hint: "The SMS will be sent to this phone if the Main Phone is opted out. If it's also opted out then SMS sending will be skipped.",
	},
];

export const toOptions: INodeProperties[] = [
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		placeholder: '+14155238886',
		required: true,
		displayOptions: {
			show: {
				operation: ['make'],
				resource: ['call'],
			},
		},
		description: 'The number to which to send the message',
	},
	...(Boolean(process.env.SMS_CHAT_REUSABLE_USED) ? smsReusableToOptions : [toFieldProperties]),
	{
		displayName: 'To Whatsapp',
		name: 'toWhatsapp',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['send'],
				resource: ['sms'],
			},
		},
		description: 'Whether the message should be sent to WhatsApp',
	},
];
