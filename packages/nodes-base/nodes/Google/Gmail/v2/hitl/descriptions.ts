import { confirmationPageOption } from '@utils/sendAndWait/descriptions';
import type { INodeProperties } from 'n8n-workflow';

/**
 * The advanced HITL section for Send and Wait. Top-level properties, not
 * members of the `options` collection: the frontend gates their visibility by
 * top-level parameter name, and `displayOptions` on collection children
 * cannot reference siblings outside the collection.
 */
export const gmailHitlProperties: INodeProperties[] = [
	{
		displayName: 'Advanced Email Options',
		name: 'advancedEmail',
		type: 'boolean',
		default: false,
		description:
			'Whether to set additional email fields such as CC, BCC, sender name, and reply threading. Also allows multiple addresses in the "To" field, separated by commas.',
	},
	{
		displayName:
			'All recipients (including CC and BCC) receive the same response links. The workflow resumes with the first response; anyone responding later is told no action is required.',
		name: 'firstResponseNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				advancedEmail: [true],
			},
		},
	},
	{
		displayName: 'Email Options',
		name: 'advancedEmailOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				advancedEmail: [true],
			},
		},
		options: [
			{
				displayName: 'BCC',
				name: 'bccList',
				type: 'string',
				description:
					'The email addresses of the blind copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'CC',
				name: 'ccList',
				type: 'string',
				description:
					'The email addresses of the copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'Reply in Thread',
				name: 'threadId',
				type: 'string',
				default: '',
				placeholder: 'e.g. 172ce2c4a72cc243',
				description:
					'The ID of the Gmail thread to send this message in, instead of starting a new one. The subject is taken from the thread, so the Subject field is ignored.',
			},
			{
				displayName: 'Send Replies To',
				name: 'replyTo',
				type: 'string',
				placeholder: 'reply@example.com',
				default: '',
				description: 'The email address that the reply message is sent to',
			},
			{
				displayName: 'Sender Name',
				name: 'senderName',
				type: 'string',
				placeholder: 'e.g. Nathan',
				default: '',
				description: "The name that will be shown in recipients' inboxes",
			},
		],
	},
	confirmationPageOption,
];

export interface GmailHitlEmailOptions {
	bccList?: string;
	ccList?: string;
	threadId?: string;
	replyTo?: string;
	senderName?: string;
}
