import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { draftFields, draftOperations } from './DraftDescription';
import { labelFields, labelOperations } from './LabelDescription';
import { getGmailAliases, getLabels, getThreadMessages } from './loadOptions';
import { messageFields, messageOperations } from './MessageDescription';
import { threadFields, threadOperations } from './ThreadDescription';
import { addThreadHeadersToEmail } from './utils/draft';
import { configureWaitTillDate } from '../../../../utils/sendAndWait/configureWaitTillDate.util';
import { sendAndWaitWebhooksDescription } from '../../../../utils/sendAndWait/descriptions';
import type { IEmail } from '../../../../utils/sendAndWait/interfaces';
import {
	createEmail,
	getSendAndWaitProperties,
	sendAndWaitWebhook,
} from '../../../../utils/sendAndWait/utils';
import {
	encodeEmail,
	googleApiRequest,
	googleApiRequestAllItems,
	parseRawEmail,
	prepareEmailAttachments,
	prepareEmailBody,
	prepareEmailsInput,
	prepareQuery,
	replyToEmail,
	simplifyOutput,
	unescapeSnippets,
} from '../GenericFunctions';

const versionDescription: INodeTypeDescription = {
	displayName: 'Gmail',
	name: 'gmail',
	icon: 'file:gmail.svg',
	group: ['transform'],
	version: [2, 2.1],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Gmail API',
	defaults: {
		name: 'Gmail',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
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
	webhooks: sendAndWaitWebhooksDescription,
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
		...getSendAndWaitProperties([
			{
				displayName: 'To',
				name: 'sendTo',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. info@example.com',
			},
		]),
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
			getLabels,
			getThreadMessages,
			getGmailAliases,
		},
	};

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const nodeVersion = this.getNode().typeVersion;
		const instanceId = this.getInstanceId();

		if (resource === 'message' && operation === SEND_AND_WAIT_OPERATION) {
			const email: IEmail = createEmail(this);

			await googleApiRequest.call(this, 'POST', '/gmail/v1/users/me/messages/send', {
				raw: await encodeEmail(email),
			});

			const waitTill = configureWaitTillDate(this);

			await this.putExecutionToWait(waitTill);
			return [this.getInputData()];
		}

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
						const labelListVisibility = this.getNodeParameter(
							'options.labelListVisibility',
							i,
							'labelShow',
						) as string;
						const messageListVisibility = this.getNodeParameter(
							'options.messageListVisibility',
							i,
							'show',
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
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/labels');

						responseData = this.helpers.returnJsonArray(responseData.labels as IDataObject[]);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
				}
				//------------------------------------------------------------------//
				//                            messages                              //
				//------------------------------------------------------------------//
				if (resource === 'message') {
					if (operation === 'send') {
						// https://developers.google.com/gmail/api/v1/reference/users/messages/send
						const options = this.getNodeParameter('options', i);
						const sendTo = this.getNodeParameter('sendTo', i) as string;
						let qs: IDataObject = {};

						const to = prepareEmailsInput.call(this, sendTo, 'To', i);
						let cc = '';
						let bcc = '';
						let replyTo = '';

						if (options.ccList) {
							cc = prepareEmailsInput.call(this, options.ccList as string, 'CC', i);
						}

						if (options.bccList) {
							bcc = prepareEmailsInput.call(this, options.bccList as string, 'BCC', i);
						}

						if (options.replyTo) {
							replyTo = prepareEmailsInput.call(this, options.replyTo as string, 'ReplyTo', i);
						}

						let attachments: IDataObject[] = [];

						if (options.attachmentsUi) {
							attachments = await prepareEmailAttachments.call(
								this,
								options.attachmentsUi as IDataObject,
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

						let appendAttribution = options.appendAttribution;
						if (appendAttribution === undefined) {
							appendAttribution = nodeVersion >= 2.1;
						}

						const email: IEmail = {
							from,
							to,
							cc,
							bcc,
							replyTo,
							subject: this.getNodeParameter('subject', i) as string,
							...prepareEmailBody.call(this, i, appendAttribution as boolean, instanceId),
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
						const options = this.getNodeParameter('options', i);

						responseData = await replyToEmail.call(this, messageIdGmail, options, i);
					}
					if (operation === 'get') {
						//https://developers.google.com/gmail/api/v1/reference/users/messages/get
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/messages/${id}`;
						const qs: IDataObject = {};

						const options = this.getNodeParameter('options', i, {});
						const simple = this.getNodeParameter('simple', i) as boolean;

						if (simple) {
							qs.format = 'metadata';
							qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
						} else {
							qs.format = 'raw';
						}

						responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);

						let nodeExecutionData: INodeExecutionData;
						if (!simple) {
							const dataPropertyNameDownload =
								(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

							nodeExecutionData = await parseRawEmail.call(
								this,
								responseData,
								dataPropertyNameDownload,
							);
						} else {
							const [json, _] = await simplifyOutput.call(this, [responseData as IDataObject]);
							nodeExecutionData = { json };
						}

						responseData = [nodeExecutionData];
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i, {});
						const filters = this.getNodeParameter('filters', i, {});
						const qs: IDataObject = {};
						Object.assign(qs, prepareQuery.call(this, filters, i), options, i);

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								'/gmail/v1/users/me/messages',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/gmail/v1/users/me/messages',
								{},
								qs,
							);
							responseData = responseData.messages;
						}

						if (responseData === undefined) {
							responseData = [];
						}

						const simple = this.getNodeParameter('simple', i) as boolean;

						if (simple) {
							qs.format = 'metadata';
							qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
						} else {
							qs.format = 'raw';
						}

						for (let index = 0; index < responseData.length; index++) {
							responseData[index] = await googleApiRequest.call(
								this,
								'GET',
								`/gmail/v1/users/me/messages/${responseData[index].id}`,
								{},
								qs,
							);

							if (!simple) {
								const dataPropertyNameDownload =
									(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

								responseData[index] = await parseRawEmail.call(
									this,
									responseData[index],
									dataPropertyNameDownload,
								);
							}
						}

						if (simple) {
							responseData = this.helpers.returnJsonArray(
								await simplifyOutput.call(this, responseData as IDataObject[]),
							);
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

					if (operation === 'addLabels') {
						const id = this.getNodeParameter('messageId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];

						const endpoint = `/gmail/v1/users/me/messages/${id}/modify`;

						const body = {
							addLabelIds: labelIds,
						};

						responseData = await googleApiRequest.call(this, 'POST', endpoint, body);
					}
					if (operation === 'removeLabels') {
						const id = this.getNodeParameter('messageId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];

						const endpoint = `/gmail/v1/users/me/messages/${id}/modify`;

						const body = {
							removeLabelIds: labelIds,
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
						const options = this.getNodeParameter('options', i);
						let qs: IDataObject = {};

						let to = '';
						let cc = '';
						let bcc = '';
						let replyTo = '';
						let fromAlias = '';
						let threadId = null;

						if (options.sendTo) {
							to += prepareEmailsInput.call(this, options.sendTo as string, 'To', i);
						}

						if (options.ccList) {
							cc = prepareEmailsInput.call(this, options.ccList as string, 'CC', i);
						}

						if (options.bccList) {
							bcc = prepareEmailsInput.call(this, options.bccList as string, 'BCC', i);
						}

						if (options.replyTo) {
							replyTo = prepareEmailsInput.call(this, options.replyTo as string, 'ReplyTo', i);
						}

						if (options.fromAlias) {
							fromAlias = options.fromAlias as string;
						}

						if (options.threadId && typeof options.threadId === 'string') {
							threadId = options.threadId;
						}

						let attachments: IDataObject[] = [];
						if (options.attachmentsUi) {
							attachments = await prepareEmailAttachments.call(
								this,
								options.attachmentsUi as IDataObject,
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
							from: fromAlias,
							to,
							cc,
							bcc,
							replyTo,
							subject: this.getNodeParameter('subject', i) as string,
							...prepareEmailBody.call(this, i),
							attachments,
						};

						if (threadId) {
							// If a threadId is set, we need to add the Message-ID of the last message in the thread
							// to the email so that Gmail can correctly associate the draft with the thread
							await addThreadHeadersToEmail.call(this, email, threadId as string);
						}

						const body = {
							message: {
								raw: await encodeEmail(email),
								threadId: threadId || undefined,
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

						const options = this.getNodeParameter('options', i);
						qs.format = 'raw';

						responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);

						const dataPropertyNameDownload =
							(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

						const nodeExecutionData = await parseRawEmail.call(
							this,
							responseData.message,
							dataPropertyNameDownload,
						);

						// Add the draft-id
						nodeExecutionData.json.messageId = nodeExecutionData.json.id;
						nodeExecutionData.json.id = responseData.id;

						responseData = [nodeExecutionData];
					}
					if (operation === 'delete') {
						// https://developers.google.com/gmail/api/v1/reference/users/drafts/delete
						const id = this.getNodeParameter('messageId', i);
						const endpoint = `/gmail/v1/users/me/drafts/${id}`;

						responseData = await googleApiRequest.call(this, 'DELETE', endpoint);

						responseData = { success: true };
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						const qs: IDataObject = {};
						Object.assign(qs, options);

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'drafts',
								'GET',
								'/gmail/v1/users/me/drafts',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/gmail/v1/users/me/drafts',
								{},
								qs,
							);
							responseData = responseData.drafts;
						}

						if (responseData === undefined) {
							responseData = [];
						}

						qs.format = 'raw';

						for (let index = 0; index < responseData.length; index++) {
							responseData[index] = await googleApiRequest.call(
								this,
								'GET',
								`/gmail/v1/users/me/drafts/${responseData[index].id}`,
								{},
								qs,
							);

							const dataPropertyNameDownload =
								(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';
							const id = responseData[index].id;
							responseData[index] = await parseRawEmail.call(
								this,
								responseData[index].message,
								dataPropertyNameDownload,
							);

							// Add the draft-id
							responseData[index].json.messageId = responseData[index].json.id;
							responseData[index].json.id = id;
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

						const options = this.getNodeParameter('options', i);
						const onlyMessages = options.returnOnlyMessages || false;
						const qs: IDataObject = {};

						const simple = this.getNodeParameter('simple', i) as boolean;

						if (simple) {
							qs.format = 'metadata';
							qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
						} else {
							qs.format = 'full';
						}

						responseData = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);

						if (onlyMessages) {
							responseData = this.helpers.returnJsonArray(
								await simplifyOutput.call(this, responseData.messages as IDataObject[]),
							);
						} else {
							responseData.messages = await simplifyOutput.call(
								this,
								responseData.messages as IDataObject[],
							);
							responseData = [{ json: responseData }];
						}
					}
					if (operation === 'getAll') {
						//https://developers.google.com/gmail/api/reference/rest/v1/users.threads/list
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						const qs: IDataObject = {};
						Object.assign(qs, prepareQuery.call(this, filters, i));

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'threads',
								'GET',
								'/gmail/v1/users/me/threads',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/gmail/v1/users/me/threads',
								{},
								qs,
							);
							responseData = responseData.threads;
						}

						if (responseData === undefined) {
							responseData = [];
						}

						responseData = this.helpers.returnJsonArray(responseData as IDataObject[]);
					}
					if (operation === 'reply') {
						const messageIdGmail = this.getNodeParameter('messageId', i) as string;
						const options = this.getNodeParameter('options', i);

						responseData = await replyToEmail.call(this, messageIdGmail, options, i);
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
					if (operation === 'addLabels') {
						const id = this.getNodeParameter('threadId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];

						const endpoint = `/gmail/v1/users/me/threads/${id}/modify`;

						const body = {
							addLabelIds: labelIds,
						};

						responseData = await googleApiRequest.call(this, 'POST', endpoint, body);
					}
					if (operation === 'removeLabels') {
						const id = this.getNodeParameter('threadId', i);
						const labelIds = this.getNodeParameter('labelIds', i) as string[];

						const endpoint = `/gmail/v1/users/me/threads/${id}/modify`;

						const body = {
							removeLabelIds: labelIds,
						};
						responseData = await googleApiRequest.call(this, 'POST', endpoint, body);
					}
				}
				//------------------------------------------------------------------//

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{
						itemData: { item: i },
					},
				);
				returnData.push(...executionData);
			} catch (error) {
				error.message = `${error.message} (item ${i})`;
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					description: error.description,
					itemIndex: i,
				});
			}
		}
		if (
			['draft', 'message', 'thread'].includes(resource) &&
			['get', 'getAll'].includes(operation)
		) {
			return [unescapeSnippets(returnData)];
		}
		return [returnData];
	}
}
