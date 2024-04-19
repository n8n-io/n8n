import type { INodeProperties } from 'n8n-workflow';

export const messagingServiceValue = 'messagingService';
const messagingServiceName = 'Messaging Service';
const messagingServiceDefaultValue = process.env.SMS_MESSAGING_SERVICE_SID || '';
export const numberValue = 'number';
const numberName = 'Number';
const fromValue = 'from';
const isSmsChatReusableUsed = Boolean(process.env.SMS_CHAT_REUSABLE_USED);
const defaultFrom = isSmsChatReusableUsed ? messagingServiceValue : numberValue;

export const fromOptions: INodeProperties[] = [
	{
		displayName: 'From',
		name: fromValue,
		type: 'options',
		displayOptions: {
			show: {
				operation: ['send'],
				resource: ['sms'],
			},
		},
		options: [
			{
				name: numberName,
				value: numberValue,
			},
			{
				name: messagingServiceName,
				value: messagingServiceValue,
			},
		],
		default: defaultFrom,
		required: true,
	},
	{
		displayName: 'From',
		name: 'from',
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
		description: 'The number from which to send the message',
	},
];

const messagingServiceNotice: INodeProperties[] = [
	{
		displayName:
			'The project messaging service should be used to receive message state updates from twilio to use it in the SMS chat reusable',
		name: 'messagingServiceNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['send'],
				resource: ['sms'],
				[fromValue]: [messagingServiceValue],
			},
		},
	},
];
export const fromFields: INodeProperties[] = [
	// ----------------------------------------
	//           from: number
	// ----------------------------------------
	{
		displayName: numberName,
		name: numberValue,
		type: 'string',
		default: '',
		placeholder: '+14155238886',
		required: true,
		displayOptions: {
			show: {
				operation: ['send'],
				resource: ['sms'],
				[fromValue]: [numberValue],
			},
		},
		hint: 'The number from which to send the message',
	},

	// ----------------------------------------
	//            from: messaging service
	// ----------------------------------------

	...(isSmsChatReusableUsed ? messagingServiceNotice : []),
	{
		displayName: messagingServiceName,
		name: messagingServiceValue,
		hint: 'The messaging service from which to send the message',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		type: 'options',
		required: true,
		default: messagingServiceDefaultValue,
		displayOptions: {
			show: {
				operation: ['send'],
				resource: ['sms'],
				[fromValue]: [messagingServiceValue],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getMessagingServicesOptions',
		},
	},
];
