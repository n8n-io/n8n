import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	createMessage,
	downloadAttachments,
	makeRecipient,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from './GenericFunctions';

import { draftFields, draftOperations } from './DraftDescription';

import { draftMessageSharedFields } from './DraftMessageSharedDescription';

import { messageFields, messageOperations } from './MessageDescription';

import {
	messageAttachmentFields,
	messageAttachmentOperations,
} from './MessageAttachmentDescription';

import { folderFields, folderOperations } from './FolderDescription';

import { folderMessageFields, folderMessageOperations } from './FolderMessageDecription';

export class MicrosoftOutlook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Outlook',
		name: 'microsoftOutlook',
		group: ['transform'],
		icon: 'file:outlook.svg',
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft Outlook API',
		defaults: {
			name: 'Microsoft Outlook',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftOutlookOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'message',
				options: [
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
					{
						name: 'Folder Message',
						value: 'folderMessage',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Message Attachment',
						value: 'messageAttachment',
					},
				],
			},
			// Draft
			...draftOperations,
			...draftFields,
			// Message
			...messageOperations,
			...messageFields,
			// Message Attachment
			...messageAttachmentOperations,
			...messageAttachmentFields,
			// Folder
			...folderOperations,
			...folderFields,
			// Folder Message
			...folderMessageOperations,
			...folderMessageFields,

			// Draft & Message
			...draftMessageSharedFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the categories to display them to user so that he can
			// select them easily
			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const categories = await microsoftApiRequestAllItems.call(
					this,
					'value',
					'GET',
					'/outlook/masterCategories',
				);
				for (const category of categories) {
					returnData.push({
						name: category.displayName as string,
						value: category.id as string,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (['draft', 'message'].includes(resource)) {
			if (operation === 'delete') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'DELETE', `/messages/${messageId}`);

						returnData.push({ success: true });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						if (additionalFields.filter) {
							qs['$filter'] = additionalFields.filter;
						}

						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/messages/${messageId}`,
							undefined,
							qs,
						);

						if (additionalFields.dataPropertyAttachmentsPrefixName) {
							const prefix = additionalFields.dataPropertyAttachmentsPrefixName as string;
							const data = await downloadAttachments.call(this, responseData, prefix);
							returnData.push.apply(returnData, data as unknown as IDataObject[]);
						} else {
							returnData.push(responseData);
						}

						if (additionalFields.dataPropertyAttachmentsPrefixName) {
							return [returnData as INodeExecutionData[]];
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'update') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i);

						// Create message from optional fields
						const body: IDataObject = createMessage(updateFields);

						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/messages/${messageId}`,
							body,
							{},
						);
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}
		}

		if (resource === 'draft') {
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					try {
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const subject = this.getNodeParameter('subject', i) as string;

						const bodyContent = this.getNodeParameter('bodyContent', i, '') as string;

						additionalFields.subject = subject;

						additionalFields.bodyContent = bodyContent || ' ';

						// Create message object from optional fields
						const body: IDataObject = createMessage(additionalFields);

						if (additionalFields.attachments) {
							const attachments = (additionalFields.attachments as IDataObject)
								.attachments as IDataObject[];

							// // Handle attachments
							body['attachments'] = attachments.map((attachment) => {
								const binaryPropertyName = attachment.binaryPropertyName as string;

								if (items[i].binary === undefined) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
										itemIndex: i,
									});
								}
								//@ts-ignore
								if (items[i].binary[binaryPropertyName] === undefined) {
									throw new NodeOperationError(
										this.getNode(),
										`No binary data property "${binaryPropertyName}" does not exists on item!`,
										{ itemIndex: i },
									);
								}

								const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
								return {
									'@odata.type': '#microsoft.graph.fileAttachment',
									name: binaryData.fileName,
									contentBytes: binaryData.data,
								};
							});
						}

						responseData = await microsoftApiRequest.call(this, 'POST', `/messages`, body, {});

						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'send') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i);
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						if (additionalFields && additionalFields.recipients) {
							const recipients = (
								(additionalFields.recipients as string).split(',') as string[]
							).filter((email) => !!email);
							if (recipients.length !== 0) {
								await microsoftApiRequest.call(this, 'PATCH', `/messages/${messageId}`, {
									toRecipients: recipients.map((recipient: string) => makeRecipient(recipient)),
								});
							}
						}

						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/messages/${messageId}/send`,
						);

						returnData.push({ success: true });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}
		}

		if (resource === 'message') {
			if (operation === 'reply') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const replyType = this.getNodeParameter('replyType', i) as string;
						const comment = this.getNodeParameter('comment', i) as string;
						const send = this.getNodeParameter('send', i, false) as boolean;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const body: IDataObject = {};

						let action = 'createReply';
						if (replyType === 'replyAll') {
							body.comment = comment;
							action = 'createReplyAll';
						} else {
							body.comment = comment;
							body.message = {};
							Object.assign(body.message, createMessage(additionalFields));
							//@ts-ignore
							delete body.message.attachments;
						}

						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/messages/${messageId}/${action}`,
							body,
						);

						if (additionalFields.attachments) {
							const attachments = (additionalFields.attachments as IDataObject)
								.attachments as IDataObject[];
							// // Handle attachments
							const data = attachments.map((attachment) => {
								const binaryPropertyName = attachment.binaryPropertyName as string;

								if (items[i].binary === undefined) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
										itemIndex: i,
									});
								}
								//@ts-ignore
								if (items[i].binary[binaryPropertyName] === undefined) {
									throw new NodeOperationError(
										this.getNode(),
										`No binary data property "${binaryPropertyName}" does not exists on item!`,
										{ itemIndex: i },
									);
								}

								const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
								return {
									'@odata.type': '#microsoft.graph.fileAttachment',
									name: binaryData.fileName,
									contentBytes: binaryData.data,
								};
							});

							for (const attachment of data) {
								await microsoftApiRequest.call(
									this,
									'POST',
									`/messages/${responseData.id}/attachments`,
									attachment,
									{},
								);
							}
						}

						if (send === true) {
							await microsoftApiRequest.call(this, 'POST', `/messages/${responseData.id}/send`);
						}

						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'getMime') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const dataPropertyNameDownload = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;
						const response = await microsoftApiRequest.call(
							this,
							'GET',
							`/messages/${messageId}/$value`,
							undefined,
							{},
							undefined,
							{},
							{ encoding: null, resolveWithFullResponse: true },
						);

						let mimeType: string | undefined;
						if (response.headers['content-type']) {
							mimeType = response.headers['content-type'];
						}

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						if (items[i].binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							Object.assign(newItem.binary!, items[i].binary);
						}

						items[i] = newItem;

						const fileName = `${messageId}.eml`;
						const data = Buffer.from(response.body as string, 'utf8');
						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName,
							mimeType,
						);
					} catch (error) {
						if (this.continueOnFail()) {
							items[i].json = { error: error.message };
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'getAll') {
				let additionalFields: IDataObject = {};
				for (let i = 0; i < length; i++) {
					try {
						const returnAll = this.getNodeParameter('returnAll', i);
						additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						if (additionalFields.filter) {
							qs['$filter'] = additionalFields.filter;
						}

						const endpoint = '/messages';

						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								endpoint,
								undefined,
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
							responseData = responseData.value;
						}

						if (additionalFields.dataPropertyAttachmentsPrefixName) {
							const prefix = additionalFields.dataPropertyAttachmentsPrefixName as string;
							const data = await downloadAttachments.call(this, responseData, prefix);
							returnData.push.apply(returnData, data as unknown as IDataObject[]);
						} else {
							returnData.push.apply(returnData, responseData);
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}

				if (additionalFields.dataPropertyAttachmentsPrefixName) {
					return [returnData as INodeExecutionData[]];
				}
			}

			if (operation === 'move') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const destinationId = this.getNodeParameter('folderId', i) as string;
						const body: IDataObject = {
							destinationId,
						};

						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/messages/${messageId}/move`,
							body,
						);
						returnData.push({ success: true });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'send') {
				for (let i = 0; i < length; i++) {
					try {
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const toRecipients = this.getNodeParameter('toRecipients', i) as string;

						const subject = this.getNodeParameter('subject', i) as string;

						const bodyContent = this.getNodeParameter('bodyContent', i, '') as string;

						additionalFields.subject = subject;

						additionalFields.bodyContent = bodyContent || ' ';

						additionalFields.toRecipients = toRecipients;

						const saveToSentItems =
							additionalFields.saveToSentItems === undefined
								? true
								: additionalFields.saveToSentItems;
						delete additionalFields.saveToSentItems;

						// Create message object from optional fields
						const message: IDataObject = createMessage(additionalFields);

						if (additionalFields.attachments) {
							const attachments = (additionalFields.attachments as IDataObject)
								.attachments as IDataObject[];

							// // Handle attachments
							message['attachments'] = attachments.map((attachment) => {
								const binaryPropertyName = attachment.binaryPropertyName as string;

								if (items[i].binary === undefined) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
										itemIndex: i,
									});
								}
								//@ts-ignore
								if (items[i].binary[binaryPropertyName] === undefined) {
									throw new NodeOperationError(
										this.getNode(),
										`No binary data property "${binaryPropertyName}" does not exists on item!`,
										{ itemIndex: i },
									);
								}

								const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
								return {
									'@odata.type': '#microsoft.graph.fileAttachment',
									name: binaryData.fileName,
									contentBytes: binaryData.data,
								};
							});
						}

						const body: IDataObject = {
							message,
							saveToSentItems,
						};

						responseData = await microsoftApiRequest.call(this, 'POST', `/sendMail`, body, {});
						returnData.push({ success: true });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}
		}

		if (resource === 'messageAttachment') {
			if (operation === 'add') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (items[i].binary === undefined) {
							throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
						}
						//@ts-ignore
						if (items[i].binary[binaryPropertyName] === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								`No binary data property "${binaryPropertyName}" does not exists on item!`,
								{ itemIndex: i },
							);
						}

						const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
						const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						const fileName =
							additionalFields.fileName === undefined
								? binaryData.fileName
								: additionalFields.fileName;

						if (!fileName) {
							throw new NodeOperationError(
								this.getNode(),
								'File name is not set. It has either to be set via "Additional Fields" or has to be set on the binary property!',
								{ itemIndex: i },
							);
						}

						// Check if the file is over 3MB big
						if (dataBuffer.length > 3e6) {
							// Maximum chunk size is 4MB
							const chunkSize = 4e6;
							const body: IDataObject = {
								AttachmentItem: {
									attachmentType: 'file',
									name: fileName,
									size: dataBuffer.length,
								},
							};

							// Create upload session
							responseData = await microsoftApiRequest.call(
								this,
								'POST',
								`/messages/${messageId}/attachments/createUploadSession`,
								body,
							);
							const uploadUrl = responseData.uploadUrl;

							if (uploadUrl === undefined) {
								throw new NodeApiError(this.getNode(), responseData, {
									message: 'Failed to get upload session',
								});
							}

							for (
								let bytesUploaded = 0;
								bytesUploaded < dataBuffer.length;
								bytesUploaded += chunkSize
							) {
								// Upload the file chunk by chunk
								const nextChunk = Math.min(bytesUploaded + chunkSize, dataBuffer.length);
								const contentRange = `bytes ${bytesUploaded}-${nextChunk - 1}/${dataBuffer.length}`;

								const data = dataBuffer.subarray(bytesUploaded, nextChunk);

								responseData = await this.helpers.request(uploadUrl, {
									method: 'PUT',
									headers: {
										'Content-Type': 'application/octet-stream',
										'Content-Length': data.length,
										'Content-Range': contentRange,
									},
									body: data,
								});
							}
						} else {
							const body: IDataObject = {
								'@odata.type': '#microsoft.graph.fileAttachment',
								name: fileName,
								contentBytes: binaryData.data,
							};

							responseData = await microsoftApiRequest.call(
								this,
								'POST',
								`/messages/${messageId}/attachments`,
								body,
								{},
							);
						}
						returnData.push({ success: true });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'download') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						const dataPropertyNameDownload = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;

						// Get attachment details first
						const attachmentDetails = await microsoftApiRequest.call(
							this,
							'GET',
							`/messages/${messageId}/attachments/${attachmentId}`,
							undefined,
							{ $select: 'id,name,contentType' },
						);

						let mimeType: string | undefined;
						if (attachmentDetails.contentType) {
							mimeType = attachmentDetails.contentType;
						}
						const fileName = attachmentDetails.name;

						const response = await microsoftApiRequest.call(
							this,
							'GET',
							`/messages/${messageId}/attachments/${attachmentId}/$value`,
							undefined,
							{},
							undefined,
							{},
							{ encoding: null, resolveWithFullResponse: true },
						);

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						if (items[i].binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							Object.assign(newItem.binary!, items[i].binary);
						}

						items[i] = newItem;
						const data = Buffer.from(response.body as string, 'utf8');
						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName,
							mimeType,
						);
					} catch (error) {
						if (this.continueOnFail()) {
							items[i].json = { error: error.message };
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						// Have sane defaults so we don't fetch attachment data in this operation
						qs['$select'] = 'id,lastModifiedDateTime,name,contentType,size,isInline';
						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/messages/${messageId}/attachments/${attachmentId}`,
							undefined,
							qs,
						);
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					try {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						// Have sane defaults so we don't fetch attachment data in this operation
						qs['$select'] = 'id,lastModifiedDateTime,name,contentType,size,isInline';
						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						if (additionalFields.filter) {
							qs['$filter'] = additionalFields.filter;
						}

						const endpoint = `/messages/${messageId}/attachments`;
						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								endpoint,
								undefined,
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
							responseData = responseData.value;
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
			}
		}

		if (resource === 'folder') {
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					try {
						const displayName = this.getNodeParameter('displayName', i) as string;
						const folderType = this.getNodeParameter('folderType', i) as string;
						const body: IDataObject = {
							displayName,
						};

						let endpoint = '/mailFolders';

						if (folderType === 'searchFolder') {
							endpoint = '/mailFolders/searchfolders/childFolders';
							const includeNestedFolders = this.getNodeParameter('includeNestedFolders', i);
							const sourceFolderIds = this.getNodeParameter('sourceFolderIds', i);
							const filterQuery = this.getNodeParameter('filterQuery', i);
							Object.assign(body, {
								'@odata.type': 'microsoft.graph.mailSearchFolder',
								includeNestedFolders,
								sourceFolderIds,
								filterQuery,
							});
						}

						responseData = await microsoftApiRequest.call(this, 'POST', endpoint, body);
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'delete') {
				for (let i = 0; i < length; i++) {
					try {
						const folderId = this.getNodeParameter('folderId', i) as string;
						responseData = await microsoftApiRequest.call(
							this,
							'DELETE',
							`/mailFolders/${folderId}`,
						);
						returnData.push({ success: true });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					try {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						if (additionalFields.filter) {
							qs['$filter'] = additionalFields.filter;
						}
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/mailFolders/${folderId}`,
							{},
							qs,
						);
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					try {
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						if (additionalFields.filter) {
							qs['$filter'] = additionalFields.filter;
						}

						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								'/mailFolders',
								{},
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequest.call(this, 'GET', '/mailFolders', {}, qs);
							responseData = responseData.value;
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
			}

			if (operation === 'getChildren') {
				for (let i = 0; i < length; i++) {
					try {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						if (additionalFields.filter) {
							qs['$filter'] = additionalFields.filter;
						}

						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/mailFolders/${folderId}/childFolders`,
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequest.call(
								this,
								'GET',
								`/mailFolders/${folderId}/childFolders`,
								undefined,
								qs,
							);
							responseData = responseData.value;
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
			}

			if (operation === 'update') {
				for (let i = 0; i < length; i++) {
					try {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {
							...updateFields,
						};

						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/mailFolders/${folderId}`,
							body,
						);
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}
		}

		if (resource === 'folderMessage') {
			for (let i = 0; i < length; i++) {
				try {
					if (operation === 'getAll') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.fields) {
							qs['$select'] = additionalFields.fields;
						}

						if (additionalFields.filter) {
							qs['$filter'] = additionalFields.filter;
						}

						const endpoint = `/mailFolders/${folderId}/messages`;
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								endpoint,
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
							responseData = responseData.value;
						}
						returnData.push.apply(returnData, responseData as IDataObject[]);
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.message });
						continue;
					}
					throw error;
				}
			}
		}

		if (
			(resource === 'message' && operation === 'getMime') ||
			(resource === 'messageAttachment' && operation === 'download')
		) {
			return this.prepareOutputData(items);
		} else {
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
