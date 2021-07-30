import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	encodeEmail,
	extractEmail,
	googleApiRequest,
	googleApiRequestAllItems,
	parseRawEmail,
} from './GenericFunctions';

import {
	messageFields,
	messageOperations,
} from './MessageDescription';

import {
	messageLabelFields,
	messageLabelOperations,
} from './MessageLabelDescription';

import {
	labelFields,
	labelOperations,
} from './LabelDescription';

import {
	draftFields,
	draftOperations,
} from './DraftDescription';

import {
	isEmpty,
} from 'lodash';

export interface IEmail {
	from?: string;
	to?: string;
	cc?: string;
	bcc?: string;
	inReplyTo?: string;
	reference?: string;
	subject: string;
	body: string;
	htmlBody?: string;
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
		icon: 'file:gmail.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Gmail API',
		defaults: {
			name: 'Gmail',
			color: '#4285F4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'serviceAccount',
						],
					},
				},
			},
			{
				name: 'gmailOAuth2',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'oAuth2',
			},
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
					{
						name: 'Message Label',
						value: 'messageLabel',
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
			//-------------------------------
			// MessageLabel Operations
			//-------------------------------
			...messageLabelOperations,
			...messageLabelFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the labels to display them to user so that he can
			// select them easily
			async getLabels(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const labels = await googleApiRequestAllItems.call(
					this,
					'labels',
					'GET',
					'/gmail/v1/users/me/labels',
				);
				for (const label of labels) {
					const labelName = label.name;
					const labelId = label.id;
					returnData.push({
						name: labelName,
						value: labelId,
					});
				}
				return returnData;
			},
		},
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
			try {
				if (resource === 'label') {
					if (operation === 'create') {
						//https://developers.google.com/gmail/api/v1/reference/users/labels/create
						const labelName = this.getNodeParameter('name', i) as string;
						const labelListVisibility = this.getNodeParameter('labelListVisibility', i) as string;
						const messageListVisibility = this.getNodeParameter('messageListVisibility', i) as string;

						method = 'POST';
						endpoint = '/gmail/v1/users/me/labels';

						body = {
							labelListVisibility,
							messageListVisibility,
							name: labelName,
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
					if (operation === 'delete') {
						//https://developers.google.com/gmail/api/v1/reference/users/labels/delete
						const labelId = this.getNodeParameter('labelId', i) as string[];

						method = 'DELETE';
						endpoint = `/gmail/v1/users/me/labels/${labelId}`;
						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
						responseData = { success: true };

					}
					if (operation === 'get') {
						// https://developers.google.com/gmail/api/v1/reference/users/labels/get
						const labelId = this.getNodeParameter('labelId', i);

						method = 'GET';
						endpoint = `/gmail/v1/users/me/labels/${labelId}`;

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/gmail/v1/users/me/labels`,
							{},
							qs,
						);

						responseData = responseData.labels;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
				}
				if (resource === 'messageLabel') {
					if (operation === 'remove') {
						//https://developers.google.com/gmail/api/v1/reference/users/messages/modify
						const messageID = this.getNodeParameter('messageId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];

						method = 'POST';
						endpoint = `/gmail/v1/users/me/messages/${messageID}/modify`;
						body = {
							removeLabelIds: labelIds,
						};
						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
					if (operation === 'add') {
						// https://developers.google.com/gmail/api/v1/reference/users/messages/modify
						const messageID = this.getNodeParameter('messageId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];

						method = 'POST';
						endpoint = `/gmail/v1/users/me/messages/${messageID}/modify`;

						body = {
							addLabelIds: labelIds,
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
				}
				if (resource === 'message') {
					if (operation === 'send') {
						// https://developers.google.com/gmail/api/v1/reference/users/messages/send

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						let toStr = '';
						let ccStr = '';
						let bccStr = '';
						let attachmentsList: IDataObject[] = [];

						const toList = this.getNodeParameter('toList', i) as IDataObject[];

						toList.forEach((email) => {
							toStr += `<${email}>, `;
						});

						if (additionalFields.ccList) {
							const ccList = additionalFields.ccList as IDataObject[];

							ccList.forEach((email) => {
								ccStr += `<${email}>, `;
							});
						}

						if (additionalFields.bccList) {
							const bccList = additionalFields.bccList as IDataObject[];

							bccList.forEach((email) => {
								bccStr += `<${email}>, `;
							});
						}

						if (additionalFields.attachmentsUi) {
							const attachmentsUi = additionalFields.attachmentsUi as IDataObject;
							const attachmentsBinary = [];
							if (!isEmpty(attachmentsUi)) {
								if (attachmentsUi.hasOwnProperty('attachmentsBinary')
									&& !isEmpty(attachmentsUi.attachmentsBinary)
									&& items[i].binary) {
									// @ts-ignore
									for (const { property } of attachmentsUi.attachmentsBinary as IDataObject[]) {
										for (const binaryProperty of (property as string).split(',')) {
											if (items[i].binary![binaryProperty] !== undefined) {
												const binaryData = items[i].binary![binaryProperty];
												attachmentsBinary.push({
													name: binaryData.fileName || 'unknown',
													content: binaryData.data,
													type: binaryData.mimeType,
												});
											}
										}
									}
								}

								qs = {
									userId: 'me',
									uploadType: 'media',
								};
								attachmentsList = attachmentsBinary;
							}
						}

						const email: IEmail = {
							from: additionalFields.senderName as string || '',
							to: toStr,
							cc: ccStr,
							bcc: bccStr,
							subject: this.getNodeParameter('subject', i) as string,
							body: this.getNodeParameter('message', i) as string,
							attachments: attachmentsList,
						};

						if (this.getNodeParameter('includeHtml', i, false) as boolean === true) {
							email.htmlBody = this.getNodeParameter('htmlMessage', i) as string;
						}

						endpoint = '/gmail/v1/users/me/messages/send';
						method = 'POST';

						body = {
							raw: await encodeEmail(email),
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
					if (operation === 'reply') {

						const id = this.getNodeParameter('messageId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						let toStr = '';
						let ccStr = '';
						let bccStr = '';
						let attachmentsList: IDataObject[] = [];

						const toList = this.getNodeParameter('toList', i) as IDataObject[];

						toList.forEach((email) => {
							toStr += `<${email}>, `;
						});

						if (additionalFields.ccList) {
							const ccList = additionalFields.ccList as IDataObject[];

							ccList.forEach((email) => {
								ccStr += `<${email}>, `;
							});
						}

						if (additionalFields.bccList) {
							const bccList = additionalFields.bccList as IDataObject[];

							bccList.forEach((email) => {
								bccStr += `<${email}>, `;
							});
						}

						if (additionalFields.attachmentsUi) {
							const attachmentsUi = additionalFields.attachmentsUi as IDataObject;
							const attachmentsBinary = [];
							if (!isEmpty(attachmentsUi)) {
								if (attachmentsUi.hasOwnProperty('attachmentsBinary')
									&& !isEmpty(attachmentsUi.attachmentsBinary)
									&& items[i].binary) {
									// @ts-ignore
									for (const { property } of attachmentsUi.attachmentsBinary as IDataObject[]) {
										for (const binaryProperty of (property as string).split(',')) {
											if (items[i].binary![binaryProperty] !== undefined) {
												const binaryData = items[i].binary![binaryProperty];
												attachmentsBinary.push({
													name: binaryData.fileName || 'unknown',
													content: binaryData.data,
													type: binaryData.mimeType,
												});
											}
										}
									}
								}

								qs = {
									userId: 'me',
									uploadType: 'media',
								};
								attachmentsList = attachmentsBinary;
							}
						}
						// if no recipient is defined then grab the one who sent the email
						if (toStr === '') {
							endpoint = `/gmail/v1/users/me/messages/${id}`;

							qs.format = 'metadata';

							const { payload } = await googleApiRequest.call(this, method, endpoint, body, qs);

							for (const header of payload.headers as IDataObject[]) {
								if (header.name === 'From') {
									toStr = `<${extractEmail(header.value as string)}>,`;
									break;
								}
							}
						}

						const email: IEmail = {
							from: additionalFields.senderName as string || '',
							to: toStr,
							cc: ccStr,
							bcc: bccStr,
							subject: this.getNodeParameter('subject', i) as string,
							body: this.getNodeParameter('message', i) as string,
							attachments: attachmentsList,
						};

						if (this.getNodeParameter('includeHtml', i, false) as boolean === true) {
							email.htmlBody = this.getNodeParameter('htmlMessage', i) as string;
						}

						endpoint = '/gmail/v1/users/me/messages/send';
						method = 'POST';

						email.inReplyTo = id;
						email.reference = id;

						body = {
							raw: await encodeEmail(email),
							threadId: this.getNodeParameter('threadId', i) as string,
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
					if (operation === 'get') {
						//https://developers.google.com/gmail/api/v1/reference/users/messages/get
						method = 'GET';

						const id = this.getNodeParameter('messageId', i);

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const format = additionalFields.format || 'resolved';

						if (format === 'resolved') {
							qs.format = 'raw';
						} else {
							qs.format = format;
						}

						endpoint = `/gmail/v1/users/me/messages/${id}`;

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);

						let nodeExecutionData: INodeExecutionData;
						if (format === 'resolved') {
							const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName as string || 'attachment_';

							nodeExecutionData = await parseRawEmail.call(this, responseData, dataPropertyNameDownload);
						} else {
							nodeExecutionData = {
								json: responseData,
							};
						}

						responseData = nodeExecutionData;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(qs, additionalFields);

						if (qs.labelIds) {
							// tslint:disable-next-line: triple-equals
							if (qs.labelIds == '') {
								delete qs.labelIds;
							} else {
								qs.labelIds = qs.labelIds as string[];
							}
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								`/gmail/v1/users/me/messages`,
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i) as number;
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/gmail/v1/users/me/messages`,
								{},
								qs,
							);
							responseData = responseData.messages;
						}

						if (responseData === undefined) {
							responseData = [];
						}

						const format = additionalFields.format || 'resolved';

						if (format !== 'ids') {

							if (format === 'resolved') {
								qs.format = 'raw';
							} else {
								qs.format = format;
							}

							for (let i = 0; i < responseData.length; i++) {
								responseData[i] = await googleApiRequest.call(
									this,
									'GET',
									`/gmail/v1/users/me/messages/${responseData[i].id}`,
									body,
									qs,
								);

								if (format === 'resolved') {
									const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName as string || 'attachment_';

									responseData[i] = await parseRawEmail.call(this, responseData[i], dataPropertyNameDownload);
								}
							}
						}

						if (format !== 'resolved') {
							responseData = this.helpers.returnJsonArray(responseData);
						}

					}
					if (operation === 'delete') {
						// https://developers.google.com/gmail/api/v1/reference/users/messages/delete
						method = 'DELETE';
						const id = this.getNodeParameter('messageId', i);

						endpoint = `/gmail/v1/users/me/messages/${id}`;

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);

						responseData = { success: true };
					}
				}
				if (resource === 'draft') {
					if (operation === 'create') {
						// https://developers.google.com/gmail/api/v1/reference/users/drafts/create

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						let toStr = '';
						let ccStr = '';
						let bccStr = '';
						let attachmentsList: IDataObject[] = [];

						if (additionalFields.toList) {
							const toList = additionalFields.toList as IDataObject[];

							toList.forEach((email) => {
								toStr += `<${email}>, `;
							});
						}

						if (additionalFields.ccList) {
							const ccList = additionalFields.ccList as IDataObject[];

							ccList.forEach((email) => {
								ccStr += `<${email}>, `;
							});
						}

						if (additionalFields.bccList) {
							const bccList = additionalFields.bccList as IDataObject[];

							bccList.forEach((email) => {
								bccStr += `<${email}>, `;
							});
						}

						if (additionalFields.attachmentsUi) {
							const attachmentsUi = additionalFields.attachmentsUi as IDataObject;
							const attachmentsBinary = [];
							if (!isEmpty(attachmentsUi)) {
								if (!isEmpty(attachmentsUi)) {
									if (attachmentsUi.hasOwnProperty('attachmentsBinary')
										&& !isEmpty(attachmentsUi.attachmentsBinary)
										&& items[i].binary) {
										for (const { property } of attachmentsUi.attachmentsBinary as IDataObject[]) {
											for (const binaryProperty of (property as string).split(',')) {
												if (items[i].binary![binaryProperty] !== undefined) {
													const binaryData = items[i].binary![binaryProperty];
													attachmentsBinary.push({
														name: binaryData.fileName || 'unknown',
														content: binaryData.data,
														type: binaryData.mimeType,
													});
												}
											}
										}
									}
								}

								qs = {
									userId: 'me',
									uploadType: 'media',
								};

								attachmentsList = attachmentsBinary;
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

						if (this.getNodeParameter('includeHtml', i, false) as boolean === true) {
							email.htmlBody = this.getNodeParameter('htmlMessage', i) as string;
						}

						endpoint = '/gmail/v1/users/me/drafts';
						method = 'POST';

						body = {
							message: {
								raw: await encodeEmail(email),
							},
						};

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
					}
					if (operation === 'get') {
						// https://developers.google.com/gmail/api/v1/reference/users/drafts/get
						method = 'GET';
						const id = this.getNodeParameter('messageId', i);

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const format = additionalFields.format || 'resolved';

						if (format === 'resolved') {
							qs.format = 'raw';
						} else {
							qs.format = format;
						}

						endpoint = `/gmail/v1/users/me/drafts/${id}`;

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);

						const binaryData: IBinaryKeyData = {};

						let nodeExecutionData: INodeExecutionData;
						if (format === 'resolved') {
							const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName as string || 'attachment_';

							nodeExecutionData = await parseRawEmail.call(this, responseData.message, dataPropertyNameDownload);

							// Add the draft-id
							nodeExecutionData.json.messageId = nodeExecutionData.json.id;
							nodeExecutionData.json.id = responseData.id;
						} else {
							nodeExecutionData = {
								json: responseData,
								binary: Object.keys(binaryData).length ? binaryData : undefined,
							};
						}

						responseData = nodeExecutionData;
					}
					if (operation === 'delete') {
						// https://developers.google.com/gmail/api/v1/reference/users/drafts/delete
						method = 'DELETE';
						const id = this.getNodeParameter('messageId', i);

						endpoint = `/gmail/v1/users/me/drafts/${id}`;

						responseData = await googleApiRequest.call(this, method, endpoint, body, qs);

						responseData = { success: true };
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(qs, additionalFields);

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'drafts',
								'GET',
								`/gmail/v1/users/me/drafts`,
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i) as number;
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/gmail/v1/users/me/drafts`,
								{},
								qs,
							);
							responseData = responseData.drafts;
						}

						if (responseData === undefined) {
							responseData = [];
						}

						const format = additionalFields.format || 'resolved';

						if (format !== 'ids') {
							if (format === 'resolved') {
								qs.format = 'raw';
							} else {
								qs.format = format;
							}

							for (let i = 0; i < responseData.length; i++) {

								responseData[i] = await googleApiRequest.call(
									this,
									'GET',
									`/gmail/v1/users/me/drafts/${responseData[i].id}`,
									body,
									qs,
								);

								if (format === 'resolved') {
									const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName as string || 'attachment_';
									const id = responseData[i].id;
									responseData[i] = await parseRawEmail.call(this, responseData[i].message, dataPropertyNameDownload);

									// Add the draft-id
									responseData[i].json.messageId = responseData[i].json.id;
									responseData[i].json.id = id;
								}
							}
						}

						if (format !== 'resolved') {
							responseData = this.helpers.returnJsonArray(responseData);
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		if (['draft', 'message'].includes(resource) && ['get', 'getAll'].includes(operation)) {
			//@ts-ignore
			return this.prepareOutputData(returnData);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
