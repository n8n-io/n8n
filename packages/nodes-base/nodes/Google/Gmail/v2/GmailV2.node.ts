/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	encodeEmail,
	extractEmail,
	googleApiRequest,
	googleApiRequestAllItems,
	IEmail,
	parseRawEmail,
	prepareEmailAttachments,
	prepareEmailBody,
	prepareEmailsInput,
	prepareQuery,
	unescapeSnippets,
} from '../GenericFunctions';

import { messageFields, messageOperations } from './MessageDescription';

import { labelFields, labelOperations } from './LabelDescription';

import { draftFields, draftOperations } from './DraftDescription';

import { threadFields, threadOperations } from './ThreadDescription';

const versionDescription: INodeTypeDescription = {
	displayName: 'Gmail',
	name: 'gmail',
	icon: 'file:gmail.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Gmail API',
	defaults: {
		name: 'Gmail',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'googleApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['serviceAccount'],
				},
			},
		},
		{
			name: 'gmailOAuth2',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
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
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'OAuth2 (recommended)',
					value: 'oAuth2',
				},
				{
					name: 'Service Account',
					value: 'serviceAccount',
				},
			],
			default: 'oAuth2',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Message',
					value: 'message',
				},
				{
					name: 'Label',
					value: 'label',
				},
				{
					name: 'Draft',
					value: 'draft',
				},
				{
					name: 'Thread',
					value: 'thread',
				},
			],
			default: 'message',
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
		// Thread Operations
		//-------------------------------
		...threadOperations,
		...threadFields,
		//-------------------------------
	],
};

export class GmailV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			// Get all the labels to display them to user so that he can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const labels = await googleApiRequestAllItems.call(
					this,
					'labels',
					'GET',
					'/gmail/v1/users/me/labels',
				);

				for (const label of labels) {
					returnData.push({
						name: label.name,
						value: label.id,
					});
				}

				return returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});
			},

			async getThreadMessages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const id = this.getNodeParameter('threadId', 0) as string;
				const { messages } = await googleApiRequest.call(
					this,
					'GET',
					`/gmail/v1/users/me/threads/${id}`,
					{},
					{ format: 'minimal' },
				);

				for (const message of messages || []) {
					returnData.push({
						name: message.snippet,
						value: message.id,
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

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				//------------------------------------------------------------------//
				//                            labels                                //
				//------------------------------------------------------------------//
				if (resource === 'label') {
					if (operation === 'create') {
						//https://developers.google.com/gmail/api/v1/reference/users/labels/create
						const labelName = this.getNodeParameter('name', i) as string;
						const labelListVisibility = this.getNodeParameter('labelListVisibility', i) as string;
						const messageListVisibility = this.getNodeParameter(
							'messageListVisibility',
							i,
						) as string;

						const body = {
							labelListVisibility,
							messageListVisibility,
							name: labelName,
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/gmail/v1/users/me/labels',
							body,
						);
					}
					if (operation === 'delete') {
						//https://developers.google.com/gmail/api/v1/reference/users/labels/delete
						const labelId = this.getNodeParameter('labelId', i) as string[];
						const endpoint = `/gmail/v1/users/me/labels/${labelId}`;

						responseData = await googleApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					}
					if (operation === 'get') {
						// https://developers.google.com/gmail/api/v1/reference/users/labels/get
						const labelId = this.getNodeParameter('labelId', i);
						const endpoint = `/gmail/v1/users/me/labels/${labelId}`;

						responseData = await googleApiRequest.call(this, 'GET', endpoint);
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						responseData = await googleApiRequest.call(this, 'GET', `/gmail/v1/users/me/labels`);

						responseData = responseData.labels;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'addLabels') {
						const id = this.getNodeParameter('resourceId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];
						const resourceAPI = this.getNodeParameter('operateOn', i) as string;

						const endpoint = `/gmail/v1/users/me/${resourceAPI}/${id}/modify`;

						const body = {
							addLabelIds: labelIds,
						};

						responseData = await googleApiRequest.call(this, 'POST', endpoint, body);
					}
					if (operation === 'removeLabels') {
						const id = this.getNodeParameter('resourceId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];
						const resourceAPI = this.getNodeParameter('operateOn', i) as string;

						const endpoint = `/gmail/v1/users/me/${resourceAPI}/${id}/modify`;

						const body = {
							removeLabelIds: labelIds,
						};
						responseData = await googleApiRequest.call(this, 'POST', endpoint, body);
					}
				}
				//------------------------------------------------------------------//
				//                            messages                              //
				//------------------------------------------------------------------//
				if (resource === 'message') {
					if (operation === 'send') {
						// https://developers.google.com/gmail/api/v1/reference/users/messages/send
						const options = this.getNodeParameter('options', i) as IDataObject;
						const sendTo = this.getNodeParameter('sendTo', i) as string;
						let qs: IDataObject = {};

						const to = prepareEmailsInput.call(this, sendTo, 'To', i);
						let cc = '';
						let bcc = '';

						if (options.ccList) {
							cc = prepareEmailsInput.call(this, options.ccList as string, 'CC', i);
						}

						if (options.bccList) {
							bcc = prepareEmailsInput.call(this, options.bccList as string, 'BCC', i);
						}

						let attachments: IDataObject[] = [];

						if (options.attachmentsUi) {
							attachments = await prepareEmailAttachments.call(
								this,
								options.attachmentsUi as IDataObject,
								items,
								i,
							);
							if (attachments.length) {
								qs = {
									userId: 'me',
									uploadType: 'media',
								};
							}
						}

						let from = '';
						if (options.senderName) {
							const { emailAddress } = await googleApiRequest.call(
								this,
								'GET',
								'/gmail/v1/users/me/profile',
							);
							from = `${options.senderName as string} <${emailAddress}>`;
						}

						const email: IEmail = {
							from,
							to,
							cc,
							bcc,
							subject: this.getNodeParameter('subject', i) as string,
							...prepareEmailBody.call(this, i),
							attachments,
						};

						const endpoint = '/gmail/v1/users/me/messages/send';

						const body = {
							raw: await encodeEmail(email),
						};

						responseData = await googleApiRequest.call(this, 'POST', endpoint, body, qs);
					}
					if (operation === 'reply') {
						const messageIdGmail = this.getNodeParameter('messageId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						let qs: IDataObject = {};

						let cc = '';
						let bcc = '';

						if (options.ccList) {
							cc = prepareEmailsInput.call(this, options.ccList as string, 'CC', i);
						}

						if (options.bccList) {
							bcc = prepareEmailsInput.call(this, options.bccList as string, 'BCC', i);
						}

						let attachments: IDataObject[] = [];
						if (options.attachmentsUi) {
							attachments = await prepareEmailAttachments.call(
								this,
								options.attachmentsUi as IDataObject,
								items,
								i,
							);
							if (attachments.length) {
								qs = {
									userId: 'me',
									uploadType: 'media',
								};
							}
						}

						const endpoint = `/gmail/v1/users/me/messages/${messageIdGmail}`;

						qs.format = 'metadata';

						const { payload, threadId } = await googleApiRequest.call(
							this,
							'GET',
							endpoint,
							{},
							qs,
						);

						let to;
						for (const header of payload.headers as IDataObject[]) {
							if (header.name === 'From') {
								to = `<${extractEmail(header.value as string)}>,`;
								break;
							}
						}

						if (options.sendTo) {
							const sendTo = options.sendTo as string;
							to += prepareEmailsInput.call(this, sendTo, 'To', i);
						}

						const subject =
							payload.headers.filter(
								(data: { [key: string]: string }) => data.name === 'Subject',
							)[0]?.value || '';

						// always empty
						// const references = payload.headers.filter((data: { [key: string]: string }) => data.name === 'References')[0]?.value || '';
						const messageIdGlobal =
							payload.headers.filter(
								(data: { [key: string]: string }) => data.name === 'Message-Id',
							)[0]?.value || '';

						let from = '';
						if (options.senderName) {
							const { emailAddress } = await googleApiRequest.call(
								this,
								'GET',
								'/gmail/v1/users/me/profile',
							);
							from = `${options.senderName as string} <${emailAddress}>`;
						}

						const email: IEmail = {
							from,
							to,
							cc,
							bcc,
							subject,
							attachments,
							inReplyTo: messageIdGlobal,
							reference: messageIdGlobal,
							...prepareEmailBody.call(this, i),
						};

						const body = {
							raw: await encodeEmail(email),
							threadId,
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/gmail/v1/users/me/messages/send',
							body,
							qs,
						);
					}
					if (operation === 'get') {
						//https://developers.google.com/gmail/api/v1/reference/users/messages/get
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/messages/${id}`;
						const qs: IDataObject = {};

						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const format = options.format || 'resolved';
						const simple = this.getNodeParameter('simple', i) as boolean;
						let labels: IDataObject[] = [];

						if (simple) {
							qs.format = 'metadata';
							qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
							const labelsData = await googleApiRequest.call(
								this,
								'GET',
								`/gmail/v1/users/me/labels`,
							);
							labels = ((labelsData.labels as IDataObject[]) || []).map(({ id, name }) => ({
								id,
								name,
							}));
						} else if (format === 'resolved') {
							qs.format = 'raw';
						} else {
							qs.format = format;
						}

						responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);

						if (simple) {
							const labelIds = (responseData.labelIds as string[]) || [];
							if (labelIds.length) {
								responseData.labels = labels.filter((label) =>
									labelIds.includes(label.id as string),
								);
								delete responseData.labelIds;
							}
						}

						let nodeExecutionData: INodeExecutionData;
						if (format === 'resolved' && !simple) {
							const dataPropertyNameDownload =
								(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

							nodeExecutionData = await parseRawEmail.call(
								this,
								responseData,
								dataPropertyNameDownload,
							);
						} else {
							nodeExecutionData = {
								json: responseData,
							};
						}

						responseData = nodeExecutionData;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						const qs: IDataObject = {};
						Object.assign(qs, prepareQuery.call(this, filters), options);

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

						const format = options.format || 'resolved';
						const simple = this.getNodeParameter('simple', i) as boolean;
						let labels: IDataObject[] = [];

						if (format !== 'ids') {
							if (simple) {
								qs.format = 'metadata';
								qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
								const labelsData = await googleApiRequest.call(
									this,
									'GET',
									`/gmail/v1/users/me/labels`,
								);
								labels = ((labelsData.labels as IDataObject[]) || []).map(({ id, name }) => ({
									id,
									name,
								}));
							} else if (format === 'resolved') {
								qs.format = 'raw';
							} else {
								qs.format = format;
							}

							for (let i = 0; i < responseData.length; i++) {
								responseData[i] = await googleApiRequest.call(
									this,
									'GET',
									`/gmail/v1/users/me/messages/${responseData[i].id}`,
									{},
									qs,
								);

								if (format === 'resolved' && !simple) {
									const dataPropertyNameDownload =
										(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

									responseData[i] = await parseRawEmail.call(
										this,
										responseData[i],
										dataPropertyNameDownload,
									);
								}

								if (simple) {
									responseData = (responseData as IDataObject[]).map((item) => {
										if (item.labelIds) {
											item.labels = labels.filter((label) =>
												(item.labelIds as string[]).includes(label.id as string),
											);
											delete item.labelIds;
										}
										return item;
									});
								}
							}
						}

						if (format !== 'resolved' || simple) {
							responseData = this.helpers.returnJsonArray(responseData);
						}
					}
					if (operation === 'delete') {
						// https://developers.google.com/gmail/api/v1/reference/users/messages/delete
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/messages/${id}`;

						responseData = await googleApiRequest.call(this, 'DELETE', endpoint);

						responseData = { success: true };
					}
					if (operation === 'markAsRead') {
						// https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/messages/${id}/modify`;

						const body = {
							removeLabelIds: ['UNREAD'],
						};

						responseData = await googleApiRequest.call(this, 'POST', endpoint, body);
					}

					if (operation === 'markAsUnread') {
						// https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/messages/${id}/modify`;

						const body = {
							addLabelIds: ['UNREAD'],
						};

						responseData = await googleApiRequest.call(this, 'POST', endpoint, body);
					}
				}
				//------------------------------------------------------------------//
				//                            drafts                                //
				//------------------------------------------------------------------//
				if (resource === 'draft') {
					if (operation === 'create') {
						// https://developers.google.com/gmail/api/v1/reference/users/drafts/create
						const options = this.getNodeParameter('options', i) as IDataObject;
						let qs: IDataObject = {};

						let to = '';
						let cc = '';
						let bcc = '';

						if (options.sendTo) {
							to += prepareEmailsInput.call(this, options.sendTo as string, 'To', i);
						}

						if (options.ccList) {
							cc = prepareEmailsInput.call(this, options.ccList as string, 'CC', i);
						}

						if (options.bccList) {
							bcc = prepareEmailsInput.call(this, options.bccList as string, 'BCC', i);
						}

						let attachments: IDataObject[] = [];
						if (options.attachmentsUi) {
							attachments = await prepareEmailAttachments.call(
								this,
								options.attachmentsUi as IDataObject,
								items,
								i,
							);
							if (attachments.length) {
								qs = {
									userId: 'me',
									uploadType: 'media',
								};
							}
						}

						const email: IEmail = {
							to,
							cc,
							bcc,
							subject: this.getNodeParameter('subject', i) as string,
							...prepareEmailBody.call(this, i),
							attachments,
						};

						const body = {
							message: {
								raw: await encodeEmail(email),
							},
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/gmail/v1/users/me/drafts',
							body,
							qs,
						);
					}
					if (operation === 'get') {
						// https://developers.google.com/gmail/api/v1/reference/users/drafts/get
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/drafts/${id}`;
						const qs: IDataObject = {};

						const options = this.getNodeParameter('options', i) as IDataObject;
						const format = options.format || 'resolved';

						if (format === 'resolved') {
							qs.format = 'raw';
						} else {
							qs.format = format;
						}

						responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);

						const binaryData: IBinaryKeyData = {};

						let nodeExecutionData: INodeExecutionData;
						if (format === 'resolved') {
							const dataPropertyNameDownload =
								(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

							nodeExecutionData = await parseRawEmail.call(
								this,
								responseData.message,
								dataPropertyNameDownload,
							);

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
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/drafts/${id}`;

						responseData = await googleApiRequest.call(this, 'DELETE', endpoint);

						responseData = { success: true };
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const qs: IDataObject = {};
						Object.assign(qs, options);

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

						const format = options.format || 'resolved';

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
									{},
									qs,
								);

								if (format === 'resolved') {
									const dataPropertyNameDownload =
										(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';
									const id = responseData[i].id;
									responseData[i] = await parseRawEmail.call(
										this,
										responseData[i].message,
										dataPropertyNameDownload,
									);

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
				//------------------------------------------------------------------//
				//                           threads                                //
				//------------------------------------------------------------------//
				if (resource === 'thread') {
					if (operation === 'delete') {
						//https://developers.google.com/gmail/api/reference/rest/v1/users.threads/delete
						const id = this.getNodeParameter('threadId', i);
						const endpoint = `/gmail/v1/users/me/threads/${id}`;

						responseData = await googleApiRequest.call(this, 'DELETE', endpoint);

						responseData = { success: true };
					}
					if (operation === 'get') {
						//https://developers.google.com/gmail/api/reference/rest/v1/users.threads/get
						const id = this.getNodeParameter('threadId', i);
						const endpoint = `/gmail/v1/users/me/threads/${id}`;

						const options = this.getNodeParameter('options', i) as IDataObject;
						const format = options.format || 'minimal';
						const onlyMessages = options.returnOnlyMessages || false;
						const qs: IDataObject = {};

						qs.format = format;

						responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);

						if (onlyMessages) {
							responseData = responseData.messages;
						}

						responseData = { json: responseData };
					}
					if (operation === 'getAll') {
						//https://developers.google.com/gmail/api/reference/rest/v1/users.threads/list
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs: IDataObject = {};
						Object.assign(qs, prepareQuery.call(this, filters));

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'threads',
								'GET',
								`/gmail/v1/users/me/threads`,
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i) as number;
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/gmail/v1/users/me/threads`,
								{},
								qs,
							);
							responseData = responseData.threads;
						}

						if (responseData === undefined) {
							responseData = [];
						}

						responseData = this.helpers.returnJsonArray(responseData);
					}
					if (operation === 'reply') {
						const messageIdGmail = this.getNodeParameter('messageId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						let qs: IDataObject = {};

						let cc = '';
						let bcc = '';

						if (options.ccList) {
							cc = prepareEmailsInput.call(this, options.ccList as string, 'CC', i);
						}

						if (options.bccList) {
							bcc = prepareEmailsInput.call(this, options.bccList as string, 'BCC', i);
						}

						let attachments: IDataObject[] = [];
						if (options.attachmentsUi) {
							attachments = await prepareEmailAttachments.call(
								this,
								options.attachmentsUi as IDataObject,
								items,
								i,
							);
							if (attachments.length) {
								qs = {
									userId: 'me',
									uploadType: 'media',
								};
							}
						}

						const endpoint = `/gmail/v1/users/me/messages/${messageIdGmail}`;

						qs.format = 'metadata';

						const { payload, threadId } = await googleApiRequest.call(
							this,
							'GET',
							endpoint,
							{},
							qs,
						);

						let to;
						for (const header of payload.headers as IDataObject[]) {
							if (header.name === 'From') {
								to = `<${extractEmail(header.value as string)}>,`;
								break;
							}
						}

						if (options.sendTo) {
							const sendTo = options.sendTo as string;
							to += prepareEmailsInput.call(this, sendTo, 'To', i);
						}

						const subject =
							payload.headers.filter(
								(data: { [key: string]: string }) => data.name === 'Subject',
							)[0]?.value || '';

						// always empty
						// const references = payload.headers.filter((data: { [key: string]: string }) => data.name === 'References')[0]?.value || '';
						const messageIdGlobal =
							payload.headers.filter(
								(data: { [key: string]: string }) => data.name === 'Message-Id',
							)[0]?.value || '';

						let from = '';
						if (options.senderName) {
							const { emailAddress } = await googleApiRequest.call(
								this,
								'GET',
								'/gmail/v1/users/me/profile',
							);
							from = `${options.senderName as string} <${emailAddress}>`;
						}

						const email: IEmail = {
							from,
							to,
							cc,
							bcc,
							subject,
							attachments,
							inReplyTo: messageIdGlobal,
							reference: messageIdGlobal,
							...prepareEmailBody.call(this, i),
						};

						const body = {
							raw: await encodeEmail(email),
							threadId,
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/gmail/v1/users/me/messages/send',
							body,
							qs,
						);
					}
					if (operation === 'trash') {
						//https://developers.google.com/gmail/api/reference/rest/v1/users.threads/trash
						const id = this.getNodeParameter('threadId', i);
						const endpoint = `/gmail/v1/users/me/threads/${id}/trash`;

						responseData = await googleApiRequest.call(this, 'POST', endpoint);
					}
					if (operation === 'untrash') {
						//https://developers.google.com/gmail/api/reference/rest/v1/users.threads/untrash
						const id = this.getNodeParameter('threadId', i);

						const endpoint = `/gmail/v1/users/me/threads/${id}/untrash`;

						responseData = await googleApiRequest.call(this, 'POST', endpoint);
					}
				}
				//------------------------------------------------------------------//

				if (!Array.isArray(responseData)) {
					responseData = [responseData];
				}
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		if (
			['draft', 'message', 'thread'].includes(resource) &&
			['get', 'getAll'].includes(operation)
		) {
			return this.prepareOutputData(unescapeSnippets(returnData) as INodeExecutionData[]);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
