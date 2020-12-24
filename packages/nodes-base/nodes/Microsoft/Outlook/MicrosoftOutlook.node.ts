import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	createMessage,
	microsoftApiRequest,
	microsoftApiRequestAllItems
} from './GenericFunctions';

import {
	messageFields,
	messageOperations,
} from './MessageDescription';

import {
	messageAttachmentFields,
	messageAttachmentOperations,
} from './MessageAttachmentDescription';

import {
	folderFields,
	folderOperations,
} from './FolderDescription';

import {
	folderMessageFields,
	folderMessageOperations,
} from './FolderMessageDecription';

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
			color: '#3a71b5',
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
				default: 'message',
				options: [
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			if (resource === 'message') {

				if (operation === 'create') {

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const subject = this.getNodeParameter('subject', i) as string;

					const bodyContent = this.getNodeParameter('bodyContent', i) as string;

					additionalFields.subject = subject;

					additionalFields.bodyContent = bodyContent;

					// Create message object from optional fields
					const body : IDataObject = createMessage(additionalFields);

					if (additionalFields.attachments) {
						const attachments = (additionalFields.attachments as IDataObject).attachments as IDataObject[];

						// // Handle attachments
						body['attachments'] = attachments.map(attachment => {
							const binaryPropertyName = attachment.binaryPropertyName as string;

							if (items[i].binary === undefined) {
								throw new Error('No binary data exists on item!');
							}
							//@ts-ignore
							if (items[i].binary[binaryPropertyName] === undefined) {
								throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
							}

							const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
							return {
								'@odata.type': '#microsoft.graph.fileAttachment',
								name: binaryData.fileName,
								contentBytes: binaryData.data,
							};
						});
					}

					responseData = await microsoftApiRequest.call(
						this,
						'POST',
						`/messages`,
						body,
						{},
					);
					returnData.push(responseData);
				}

				if (operation === 'createReply') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const replyType = this.getNodeParameter('replyType', i) as string;

					let action = 'createReply';
					if (replyType === 'replyAll') {
						action = 'createReplyAll';
					}

					responseData = await microsoftApiRequest.call(
						this,
						'POST',
						`/messages/${messageId}/${action}`,
					);
					returnData.push(responseData);
				}

				if (operation === 'delete') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					responseData = await microsoftApiRequest.call(
						this,
						'DELETE',
						`/messages/${messageId}`,
					);
					returnData.push({success: true});
				}

				if (operation === 'get') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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
					),
					returnData.push(responseData);
				}

				if (operation === 'getMime') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;
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
						Object.assign(newItem.binary, items[i].binary);
					}

					items[i] = newItem;


					const fileName = `${messageId}.eml`;
					const data = Buffer.from(response.body as string, 'utf8');
					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data as unknown as Buffer, fileName, mimeType);
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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
						qs['$top'] = this.getNodeParameter('limit', i) as number;
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							endpoint,
							undefined,
							qs,
						);
						responseData = responseData.value;
					}
					returnData.push.apply(returnData, responseData as IDataObject[]);
				}

				if (operation === 'move') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const destinationId = this.getNodeParameter('folderId', i) as string;
					const body : IDataObject = {
						destinationId,
					};

					responseData = await microsoftApiRequest.call(
						this,
						'POST',
						`/messages/${messageId}/move`,
						body,
					);
					returnData.push({success: true});
				}

				if (operation === 'update') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					// Create message from optional fields
					const body : IDataObject = createMessage(updateFields);

					responseData = await microsoftApiRequest.call(
						this,
						'PATCH',
						`/messages/${messageId}`,
						body,
						{},
					);
					returnData.push(responseData);
				}

				if (operation === 'send') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const saveToSentItems = this.getNodeParameter('saveToSentItems', i) as boolean;

					const toRecipients = this.getNodeParameter('toRecipients', i) as string[];

					const subject = this.getNodeParameter('subject', i) as string;

					const bodyContent = this.getNodeParameter('bodyContent', i) as string;

					additionalFields.subject = subject;

					additionalFields.bodyContent = bodyContent;

					additionalFields.toRecipients = toRecipients;

					// Create message object from optional fields
					const message : IDataObject = createMessage(additionalFields);


					if (additionalFields.attachments) {
						const attachments = (additionalFields.attachments as IDataObject).attachments as IDataObject[];

						// // Handle attachments
						message['attachments'] = attachments.map(attachment => {
							const binaryPropertyName = attachment.binaryPropertyName as string;

							if (items[i].binary === undefined) {
								throw new Error('No binary data exists on item!');
							}
							//@ts-ignore
							if (items[i].binary[binaryPropertyName] === undefined) {
								throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
							}

							const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
							return {
								'@odata.type': '#microsoft.graph.fileAttachment',
								name: binaryData.fileName,
								contentBytes: binaryData.data,
							};
						});
					}

					const body : IDataObject = {
						message,
						saveToSentItems,
					};

					responseData = await microsoftApiRequest.call(
						this,
						'POST',
						`/sendMail`,
						body,
						{},
					);
					returnData.push({ success: true });
				}

				if (operation === 'sendDraft') {
					const messageId = this.getNodeParameter('messageId', i);
					responseData = await microsoftApiRequest.call(
						this,
						'POST',
						`/messages/${messageId}/send`,
					);
					returnData.push({ success: true });
				}
			}

			if (resource === 'messageAttachment') {
				if (operation === 'add') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const fileName = this.getNodeParameter('fileName', i) as string;
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;

					if (items[i].binary === undefined) {
						throw new Error('No binary data exists on item!');
					}
					//@ts-ignore
					if (items[i].binary[binaryPropertyName] === undefined) {
						throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
					}

					const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
					const dataBuffer = Buffer.from(binaryData.data, 'base64');

					// Check if the file is over 3MB big
					if (dataBuffer.length > 3e6) {
						// Maximum chunk size is 4MB
						const chunkSize = 4e6;
						const body : IDataObject = {
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
							throw new Error('Failed to get upload session');
						}

						for (let bytesUploaded = 0; bytesUploaded < dataBuffer.length; bytesUploaded += chunkSize) {
							// Upload the file chunk by chunk
							const nextChunk = Math.min(bytesUploaded + chunkSize, dataBuffer.length);
							const contentRange = `bytes ${bytesUploaded}-${nextChunk - 1}/${dataBuffer.length}`;

							const data = dataBuffer.subarray(bytesUploaded, nextChunk);

							responseData = await this.helpers.request(
								uploadUrl,
								{
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
						const body : IDataObject = {
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
				}

				if (operation === 'download') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const attachmentId = this.getNodeParameter('attachmentId', i) as string;
					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

					// Get attachment details first
					const attachmentDetails = await microsoftApiRequest.call(
						this,
						'GET',
						`/messages/${messageId}/attachments/${attachmentId}`,
						undefined,
						{ '$select': 'id,name,contentType' },
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
						Object.assign(newItem.binary, items[i].binary);
					}

					items[i] = newItem;
					const data = Buffer.from(response.body as string, 'utf8');
					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data as unknown as Buffer, fileName, mimeType);
				}

				if (operation === 'get') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const attachmentId = this.getNodeParameter('attachmentId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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
				}

				if (operation === 'getAll') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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
						qs['$top'] = this.getNodeParameter('limit', i) as number;
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							endpoint,
							undefined,
							qs,
						);
						responseData = responseData.value;
					}
					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}

			if (resource === 'folder') {
				if (operation === 'create') {
					const displayName = this.getNodeParameter('displayName', i) as string;
					const folderType = this.getNodeParameter('folderType', i) as string;
					const body : IDataObject = {
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

					responseData = await microsoftApiRequest.call(
						this,
						'POST',
						endpoint,
						body,
					);
					returnData.push(responseData);
				}

				if (operation === 'delete') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					responseData = await microsoftApiRequest.call(
						this,
						'DELETE',
						`/mailFolders/${folderId}`,
					);
					returnData.push({ success: true });
				}

				if (operation === 'get') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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
						qs['$top'] = this.getNodeParameter('limit', i) as number;
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							'/mailFolders',
							{},
							qs,
						);
						responseData = responseData.value;
					}
					returnData.push.apply(returnData, responseData as IDataObject[]);
				}

				if (operation === 'getChildren') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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
					}  else {
						qs['$top'] = this.getNodeParameter('limit', i) as number;
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
				}

				// if (operation === 'listMessages') {
				// 	const folderId = this.getNodeParameter('folderId', i) as string;
				// 	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
				// 	const filters = this.getNodeParameter('filters', i) as IDataObject;

				// 	if (filters.fields) {
				// 		qs['$select'] = filters.fields;
				// 	};

				// 	const endpoint = `/mailFolders/${folderId}/messages`;
				// 	if (returnAll)
				// 		responseData = await microsoftApiRequestAllItems.call(
				// 			this,
				// 			'value',
				// 			'GET',
				// 			endpoint,
				// 			qs,
				// 		);
				// 	else {
				// 		qs['$top'] = this.getNodeParameter('limit', i) as number;
				// 		responseData = await microsoftApiRequest.call(
				// 			this,
				// 			'GET',
				// 			endpoint,
				// 			undefined,
				// 			qs
				// 		);
				// 		responseData = responseData.value;
				// 	}
				// 	returnData.push.apply(returnData, responseData as IDataObject[]);
				// }

				if (operation === 'update') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body : IDataObject = {
						...updateFields,
					};

					responseData = await microsoftApiRequest.call(
						this,
						'PATCH',
						`/mailFolders/${folderId}`,
						body,
					);
					returnData.push(responseData);
				}
			}

			if (resource === 'folderMessage') {

				if (operation === 'getAll') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.fields) {
						qs['$select'] = additionalFields.fields;
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
					}
					else {
						qs['$top'] = this.getNodeParameter('limit', i) as number;
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							endpoint,
							undefined,
							qs,
						);
						responseData = responseData.value;
					}
					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}
		}

		if ((resource === 'message' && operation === 'getMime') || (resource === 'messageAttachment' && operation === 'download')) {
			return this.prepareOutputData(items);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
