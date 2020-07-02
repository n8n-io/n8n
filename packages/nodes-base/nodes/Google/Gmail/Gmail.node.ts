import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
	encodeEmail,
} from './GenericFunctions';

import {
	messageOperations,
	messageFields,
} from './MessageDescription';

import {
	labelOperations,
	labelFields,
} from './LabelDescription';

import {
	draftOperations,
	draftFields,
} from './DraftDescription';

import {
	isEmpty,
} from 'lodash';

export interface IEmail {
	to?: string;
	cc?: string;
	bcc?: string;
	inReplyTo?: string;
	reference?: string;
	subject: string;
	body: string;
	attachments?: IDataObject[];
}

interface IAttachments {
	type: string;
	name: string;
	content: string;
}

export class Gmail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gmail',
		name: 'gmail',
		icon: 'file:gmail.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Gmail API',
		defaults: {
			name: 'Gmail',
			color: '#d93025',
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
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Label',
						value: 'label',
					},
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'draft',
				description: 'The resource to operate on.',
			},
			//-------------------------------
			// Draft Operations
			//-------------------------------
			...draftOperations,
			...draftFields,
			//-------------------------------
			// Label Operations
			//-------------------------------
			...labelOperations,
			...labelFields,
			//-------------------------------
			// Message Operations
			//-------------------------------
			...messageOperations,
			...messageFields,
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let method = '';
		let body: IDataObject = {};
		let qs: IDataObject = {};
		let endpoint = '';
		let responseData;

		for (let i = 0; i < items.length; i++) {
			//-------------------------------
			// Label Operations
			//-------------------------------
			if(resource === 'label') {
				//-------------------------------
				// Create Label
				//-------------------------------
				if(operation === 'create') {
					// https://developers.google.com/gmail/api/v1/reference/users/labels/create
					const labelName = this.getNodeParameter('name', i) as string;

					method = 'POST';
					endpoint = '/gmail/v1/users/me/labels';

					body = {
						labelListVisibility: 'labelShow',
						messageListVisibility: 'show',
						name: labelName,
					};

					responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
				//-------------------------------
				// Add/Remove Label
				//-------------------------------
				} else if(['add', 'delete'].includes(operation)) {
					// https://developers.google.com/gmail/api/v1/reference/users/messages/modify
					const messageID = this.getNodeParameter('messageId', i);
					const labelID = this.getNodeParameter('labelId', i);

					method = 'POST';
					endpoint = `/gmail/v1/users/me/messages/${messageID}/modify`;

					if(operation === 'add') {
						body = {
							addLabelIds: [
								labelID,
							]
						};
					} else if (operation === 'delete') {
						body = {
							removeLabelIds: [
								labelID,
							]
						};
					}

					responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
				//-------------------------------
				// Get Label
				//-------------------------------
				} else if(operation === 'get') {
					// https://developers.google.com/gmail/api/v1/reference/users/labels/get
					const labelID = this.getNodeParameter('labelId', i);

					method = 'GET';
					endpoint = `/gmail/v1/users/me/labels/${labelID}`;

					responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
				}
			//-------------------------------
			// Message and Draft Operations
			//-------------------------------
			} else if(['message', 'draft'].includes(resource)) {
				//------------------------------------
				// Create or Reply to a Message/Draft
				//------------------------------------
				if(['create', 'reply'].includes(operation)) {
					//------------------------------------
					// Handle the input
					//------------------------------------
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					let toStr = '';
					let ccStr = '';
					let bccStr = '';
					let attachmentsList: IDataObject[] = [];

					// Handle the To field differently between message and draft, but the rest of the fields are the same
					if(resource === 'message') {
						const toList = this.getNodeParameter('toList', i) as IDataObject[];

						toList.forEach((email) => {
							toStr += `<${email}>, `;
						});
					} else {
						if(additionalFields.toList) {
							const toList = additionalFields.toList as IDataObject[];

							toList.forEach((email) => {
								toStr += `<${email}>, `;
							});
						}
					}

					if(additionalFields.ccList) {
						const ccList = additionalFields.ccList as IDataObject[];

						ccList.forEach((email) => {
							ccStr += `<${email}>, `;
						});
					}

					if(additionalFields.bccList) {
						const bccList = additionalFields.bccList as IDataObject[];

						bccList.forEach((email) => {
							bccStr += `<${email}>, `;
						});
					}

					if(additionalFields.attachmentsUi) {
						const attachmentsUi = additionalFields.attachmentsUi as IDataObject;
						let attachmentsBinary = [], attachmentsValues = [];
						if (!isEmpty(attachmentsUi)) {
							if (attachmentsUi.hasOwnProperty('attachmentsValues')
								&& !isEmpty(attachmentsUi.attachmentsValues)) {
								// @ts-ignore
								attachmentsValues = attachmentsUi.attachmentsValues.map((value) => {
									const aux: IAttachments = {name: '', content: '', type: ''};
									aux.name = value.name;
									aux.content = value.content;
									aux.type = value.type;
									return aux;
								});
							}

							if (attachmentsUi.hasOwnProperty('attachmentsBinary')
								&& !isEmpty(attachmentsUi.attachmentsBinary)
								&& items[i].binary) {
								// @ts-ignore
								attachmentsBinary = attachmentsUi.attachmentsBinary.map((value) => {
									if (items[i].binary!.hasOwnProperty(value.property)) {
										const aux: IAttachments = {name: '', content: '', type: ''};
										aux.name = items[i].binary![value.property].fileName || 'unknown';
										aux.content = items[i].binary![value.property].data;
										aux.type = items[i].binary![value.property].mimeType;
										return aux;
									}
								});
							}

							qs = {
								userId: 'me',
								uploadType: 'media',
							};

							attachmentsList = attachmentsBinary.concat(attachmentsValues) as IDataObject[];
						}
					}


					const email: IEmail = {
						to: toStr,
						cc: ccStr,
						bcc: bccStr,
						subject: this.getNodeParameter('subject', i) as string,
						body: this.getNodeParameter('message', i) as string,
						attachments: attachmentsList,
					};

					//-------------------------------------------------------------
					// Define the endpoints and the qs/body for each operation
					//-------------------------------------------------------------

					//------------------------------------
					// Create a draft
					//------------------------------------
					if(resource === 'draft' && operation === 'create') {
						// https://developers.google.com/gmail/api/v1/reference/users/drafts/create
						endpoint = '/gmail/v1/users/me/drafts';
						method = 'POST';

						body = {
							message: {
								raw: encodeEmail(email),
							},
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					//------------------------------------
					// Send a message
					//------------------------------------
					} else if(resource === 'message' && operation === 'create') {
						// https://developers.google.com/gmail/api/v1/reference/users/messages/send
						endpoint = '/gmail/v1/users/me/messages/send';
						method = 'POST';

						body = {
							raw: encodeEmail(email),
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					//------------------------------------
					// Reply to a message
					//------------------------------------
					} else if(resource === 'message' && operation === 'reply') {
						// same endpoint as send, but includes a thread ID and new params of the email
						endpoint = '/gmail/v1/users/me/messages/send';
						method = 'POST';

						email.inReplyTo = this.getNodeParameter('messageId', i) as string;
						email.reference = this.getNodeParameter('messageId', i) as string;

						body = {
							raw: encodeEmail(email),
							threadId: this.getNodeParameter('threadId', i) as string,
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
				//------------------------------------
				// Get a Message/Draft
				//------------------------------------
				} else if(operation === 'get') {
					// https://developers.google.com/gmail/api/v1/reference/users/drafts/get
					// https://developers.google.com/gmail/api/v1/reference/users/messages/get
					method = 'GET';
					const id = this.getNodeParameter('messageId', i);

					if(resource === 'draft') {
						endpoint = `/gmail/v1/users/me/drafts/${id}`;
					} else if(resource === 'message') {
						endpoint = `/gmail/v1/users/me/messages/${id}`;
					}

					responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
				//------------------------------------
				// Delete a Message/Draft
				//------------------------------------
				} else if(operation === 'delete') {
					// https://developers.google.com/gmail/api/v1/reference/users/drafts/delete
					// https://developers.google.com/gmail/api/v1/reference/users/messages/delete
					method = 'DELETE';
					const id = this.getNodeParameter('messageId', i);

					if(resource === 'draft') {
						endpoint = `/gmail/v1/users/me/drafts/${id}`;
					} else if(resource === 'message') {
						endpoint = `/gmail/v1/users/me/messages/${id}`;
					}

					responseData = await googleApiRequest.call(this, method, endpoint, body, qs);

					responseData = { success: true };
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
