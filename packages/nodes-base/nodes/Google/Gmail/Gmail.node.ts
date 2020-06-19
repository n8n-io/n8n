import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
	encodeEmail
} from './GenericFunctions';

export class Gmail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gmail',
		name: 'gmail',
		icon: 'file:gmail.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'View, Write, and Send Emails and Manage Your Inbox',
		defaults: {
			name: 'Gmail',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gmailOAuth2',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Labels',
						value: 'label',
					},
					{
						name: 'Emails',
						value: 'email',
					},
				],
				default: 'label',
				description: 'The resource to operate on.',
			},
			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'label',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new label',
					},
					{
						name: 'Add',
						value: 'add',
						description: 'Add a label'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a label',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Label Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'label'
						],
						operation: [
							'create'
						]
					},
				},
				placeholder: 'invoices',
				description: 'Label Name',
			},
			{
				displayName: 'Message ID',
				name: 'messageID',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'label'
						],
						operation: [
							'add',
							'delete'
						]
					},
				},
				placeholder: '',
				description: 'The message ID of your email.',
			},
			{
				displayName: 'Label ID',
				name: 'labelID',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'label'
						],
						operation: [
							'add',
							'delete'
						]
					},
				},
				placeholder: 'Label_14',
				description: 'The ID of the email.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
					},
				},
				options: [
					{
						name: 'Create Draft',
						value: 'create',
						description: 'Create a new email draft',
					},
					{
						name: 'Create and Send',
						value: 'send',
						description: 'Create and send an email'
					},
					{
						name: 'Reply',
						value: 'reply',
						description: 'Reply to an email',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Thread ID',
				name: 'threadID',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
						operation: [
							'reply'
						]
					},
				},
				placeholder: '',
				description: 'The id of the thread you are replying to.',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
					},
				},
				placeholder: 'Name <example@example.com>',
				description: 'The email sender.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
					},
				},
				placeholder: 'Name <example@example.com>',
				description: 'The email recipient.',
			},
			{
				displayName: 'Cc',
				name: 'cc',
				type: 'string',
				default: '',
				//required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
					},
				},
				placeholder: 'Name <example@example.com>',
				description: 'People cced on the email.',
			},
			{
				displayName: 'Bcc',
				name: 'bcc',
				type: 'string',
				default: '',
				//required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
					},
				},
				placeholder: 'Name <example@example.com>',
				description: 'People bcced on the email.',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				//required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
					},
				},
				placeholder: 'Name <example@example.com>',
				description: 'Email address you are replying to.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
					},
				},
				placeholder: 'Hello World!',
				description: 'The message subject.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'email'
						],
					},
				},
				placeholder: 'Hello World!',
				description: 'The message body.',
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let method = '';
		let body: IDataObject = {};
		let qs: IDataObject = {};
		let endpoint = '';

		let email =  { // eventually to, cc, bcc, and replyTo should be arrays
			from: '',
			to: '',
			cc: '',
			bcc: '',
			replyTo: '',
			subject: '',
			body: ''
		};

		//---------------------------------------------
		// I want to give a lot more flexability here
		//---------------------------------------------

		for (let i = 0; i < items.length; i++) {
			if(resource === 'label') {
				if(operation === 'create') {
					// https://developers.google.com/gmail/api/v1/reference/users/labels/create
					method = 'POST';

					endpoint = '/gmail/v1/users/me/labels';

					const labelName = this.getNodeParameter('name', i) as string;

					body = {
						'labelListVisibility': 'labelShow',
						'messageListVisibility': 'show',
						'name': labelName
					};
				} else if(['add', 'delete'].includes(operation)) {
					// https://developers.google.com/gmail/api/v1/reference/users/messages/modify

					method = 'POST';

					const messageID = this.getNodeParameter('messageID', i);
					const labelID = this.getNodeParameter('labelID', 0);

					endpoint = `/gmail/v1/users/me/messages/${messageID}/modify`;

					if(operation === 'add') {
						body = {
							'addLabelIds': [
								labelID
							]
						};
					} else if (operation === 'delete') {
						body = {
							'removeLabelIds': [
								labelID
							]
						};
					}
				}
			} else if(resource === 'email') {
				if(operation === 'create') {
					method = 'POST';

					endpoint = '/gmail/v1/users/me/drafts';

					email =  {
						from: this.getNodeParameter('from', i) as string,
						to: this.getNodeParameter('to', i) as string,
						cc: this.getNodeParameter('cc', i) as string,
						bcc: this.getNodeParameter('bcc', i) as string,
						replyTo: this.getNodeParameter('replyTo', i) as string,
						subject: this.getNodeParameter('subject', i) as string,
						body: this.getNodeParameter('message', i) as string
					};

					const encodedMessage = encodeEmail(email);

					body = {
						'message': {
						  'raw': encodedMessage
						}
					};
				} else if(operation === 'send') {
					method = 'POST';

					endpoint = '/gmail/v1/users/me/messages/send';

					email =  {
						from: this.getNodeParameter('from', i) as string,
						to: this.getNodeParameter('to', i) as string,
						cc: this.getNodeParameter('cc', i) as string,
						bcc: this.getNodeParameter('bcc', i) as string,
						replyTo: this.getNodeParameter('replyTo', i) as string,
						subject: this.getNodeParameter('subject', i) as string,
						body: this.getNodeParameter('message', i) as string
					};

					const encodedMessage = encodeEmail(email);

					console.log(encodedMessage);

					body = {
						'raw': encodedMessage
					};
				} else if(operation === 'reply') {
					method = 'POST';

					endpoint = '/gmail/v1/users/me/messages/send';

					email =  {
						from: this.getNodeParameter('from', i) as string,
						to: this.getNodeParameter('to', i) as string,
						cc: this.getNodeParameter('cc', i) as string,
						bcc: this.getNodeParameter('bcc', i) as string,
						replyTo: this.getNodeParameter('replyTo', i) as string,
						subject: this.getNodeParameter('subject', i) as string,
						body: this.getNodeParameter('message', i) as string
					};

					const encodedMessage = encodeEmail(email);

					const threadID = this.getNodeParameter('threadID', i);

					body = {
						'raw': encodedMessage,
						'threadId': threadID
					};
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}
		}

		const uri = `https://www.googleapis.com${endpoint}`;

		const responseData = await googleApiRequest.call(this, method, resource, body, qs, uri);

		console.log([this.helpers.returnJsonArray(responseData)]);

		return [this.helpers.returnJsonArray(responseData)];

	}
}
