import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject, ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	IMessage,
	IMessageUi,
} from './MessageInterface';

import {
	attachmentFields,
	attachmentOperations,
	incomingWebhookFields,
	incomingWebhookOperations,
	mediaFields,
	mediaOperations,
	memberFields,
	memberOperations,
	messageFields,
	messageOperations,
	spaceFields,
	spaceOperations
} from './descriptions';

import {
	googleApiRequest,
	googleApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

export class GoogleChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Chat',
		name: 'googleChat',
		icon: 'file:googleChat.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Chat API',
		defaults: {
			name: 'Google Chat',
			color: '#0aa55c',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: false, // not required, webhooks do not need credentials
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Media',
						value: 'media',
					},
					{
						name: 'Space',
						value: 'space',
					},
					{
						name: 'Member',
						value: 'member',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Attachment',
						value: 'attachment',
					},
					{
						name: 'Incoming Webhook',
						value: 'incomingWebhook',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},
			...mediaOperations,
			...mediaFields,
			...spaceOperations,
			...spaceFields,
			...memberOperations,
			...memberFields,
			...messageOperations,
			...messageFields,
			...attachmentOperations,
			...attachmentFields,
			...incomingWebhookOperations,
			...incomingWebhookFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the spaces to display them to user so that he can
			// select them easily
			async getSpaces(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const spaces = await googleApiRequestAllItems.call(
					this,
					'spaces',
					'GET',
					`/v1/spaces`,
				);
				for (const space of spaces) {
					const spaceName = space.name;
					const spaceId = space.name;
					returnData.push({
						name: spaceName,
						value: spaceId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'media') {
					if (operation === 'download') {
						// ----------------------------------------
						//             media: download
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/media/download

						const resourceName = this.getNodeParameter('resourceName', i) as string;

						const endpoint = `/v1/media/${resourceName}?alt=media`;

						// Return the data as a buffer
						const encoding = null;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							endpoint,
							undefined,
							undefined,
							undefined,
							undefined,
							encoding,
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

						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

						items[i].binary![binaryPropertyName] = await this.helpers.prepareBinaryData(responseData, endpoint);

					}

				} else if (resource === 'space') {
					if (operation === 'get') {

						// ----------------------------------------
						//             space: get
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces/get

						const spaceName = this.getNodeParameter('spaceName', i) as string;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/v1/${spaceName}`,
						);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             space: getAll
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces/list

						const returnAll = this.getNodeParameter('returnAll', 0) as IDataObject;
						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'spaces',
								'GET',
								`/v1/spaces`,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.pageSize = limit >>> 0; // convert to an unsigned 32-bit integer

							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/v1/spaces`,
								undefined,
								qs,
							);
							responseData = responseData.spaces;
						}
					}
				} else if (resource === 'member') {
					if (operation === 'get') {

						// ----------------------------------------
						//             member: get
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces.members/get

						const memberName = this.getNodeParameter('memberName', i) as string;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/v1/${memberName}`,
						);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             member: getAll
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces.members/list

						const spaceName = this.getNodeParameter('spaceName', i) as string;

						const returnAll = this.getNodeParameter('returnAll', 0) as IDataObject;
						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'memberships',
								'GET',
								`/v1/${spaceName}/members`,
								undefined,
								qs,
							);

						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.pageSize = limit >>> 0; // convert to an unsigned 32-bit integer

							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/v1/${spaceName}/members`,
								undefined,
								qs,
							);
							responseData = responseData.memberships;
						}

					}
				} else if (resource === 'message') {
					if (operation === 'create') {

						// ----------------------------------------
						//             message: create
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces.messages/create

						const spaceName = this.getNodeParameter('spaceName', i) as string;

						// get additional fields for threadKey and requestId
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (additionalFields.threadKey) {
							qs.threadKey = additionalFields.threadKey;
						}
						if (additionalFields.requestId) {
							qs.requestId = additionalFields.requestId;
						}

						let message: IMessage = {};
						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
						if (jsonParameters) {
							const messageJson = this.getNodeParameter('messageJson', i);

							if (messageJson instanceof Object) {
								// if it is an object
								message = messageJson as IMessage;
							} else {
								// if it is a string
								if (validateJSON(messageJson as string) !== undefined) {
									message = JSON.parse(messageJson as string) as IMessage;
								} else {
									throw new NodeOperationError(this.getNode(), 'Message (JSON) must be a valid json');
								}
							}

						} else {
							const messageUi = this.getNodeParameter('messageUi', i) as IMessageUi;
							if (messageUi.text && messageUi.text !== '') {
								message.text = messageUi.text;
							} else {
								throw new NodeOperationError(this.getNode(), 'Message Text must be provided.');
							}
							// 	// TODO: get cards from the UI
							// if (messageUi?.cards?.metadataValues && messageUi?.cards?.metadataValues.length !== 0) {
							// 	const cards = messageUi.cards.metadataValues as IDataObject[]; // TODO: map cards to messageUi.cards.metadataValues
							// 	message.cards = cards;
							// }
						}

						const body: IDataObject = {};
						Object.assign(body, message);

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/v1/${spaceName}/messages`,
							body,
							qs,
						);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//             message: delete
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces.messages/delete

						const messageName = this.getNodeParameter('messageName', i) as string;

						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							`/v1/${messageName}`,
						);

					} else if (operation === 'get') {

						// ----------------------------------------
						//             message: get
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces.messages/get

						const messageName = this.getNodeParameter('messageName', i) as string;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/v1/${messageName}`,
						);

					} else if (operation === 'update') {

						// ----------------------------------------
						//             message: update
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces.messages/update

						const messageName = this.getNodeParameter('messageName', i) as string;

						let message: IMessage = {};
						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
						if (jsonParameters) {
							const messageJson = this.getNodeParameter('messageJson', i);

							if (messageJson instanceof Object) {
								// if it is an object
								message = messageJson as IMessage;
							} else {
								// if it is a string
								if (validateJSON(messageJson as string) !== undefined) {
									message = JSON.parse(messageJson as string) as IMessage;
								} else {
									throw new NodeOperationError(this.getNode(), 'Message (JSON) must be a valid json');
								}
							}

						} else {
							const messageUi = this.getNodeParameter('messageUi', i) as IDataObject;
							if (messageUi.text) {
								message.text = messageUi.text as string;
							}
							// // TODO: get cards from the UI
							// if (messageUi.cards) {
							// 	message.cards = messageUi.cards as IDataObject[];
							// }
						}

						const body: IDataObject = {};
						Object.assign(body, message);

						// get update mask
						let updateMask = '';
						if (message.text) {
							updateMask += 'text,';
						}
						if (message.cards) {
							updateMask += 'cards,';
						}
						updateMask = updateMask.slice(0, -1); // remove trailing comma
						qs.updateMask = updateMask;

						responseData = await googleApiRequest.call(
							this,
							'PUT',
							`/v1/${messageName}`,
							body,
							qs,
						);
					}

				} else if (resource === 'attachment') {

					if (operation === 'get') {
						// ----------------------------------------
						//             attachment: get
						// ----------------------------------------

						// https://developers.google.com/chat/reference/rest/v1/spaces.messages.attachments/get

						const attachmentName = this.getNodeParameter('attachmentName', i) as string;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/v1/${attachmentName}`,
						);
					}
				} else if (resource === 'incomingWebhook') {
					if (operation === 'create') {

						// ----------------------------------------
						//             incomingWebhook: create
						// ----------------------------------------

						// https://developers.google.com/chat/how-tos/webhooks

						const uri = this.getNodeParameter('incomingWebhookUrl', i) as string;

						// get additional fields for threadKey
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (additionalFields.threadKey) {
							qs.threadKey = additionalFields.threadKey;
						}

						let message: IMessage = {};
						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
						if (jsonParameters) {
							const messageJson = this.getNodeParameter('messageJson', i);

							if (messageJson instanceof Object) {
								// if it is an object
								message = messageJson as IMessage;
							} else {
								// if it is a string
								if (validateJSON(messageJson as string) !== undefined) {
									message = JSON.parse(messageJson as string) as IMessage;
								} else {
									throw new NodeOperationError(this.getNode(), 'Message (JSON) must be a valid json');
								}
							}

						} else {
							const messageUi = this.getNodeParameter('messageUi', i) as IMessageUi;
							if (messageUi.text && messageUi.text !== '') {
								message.text = messageUi.text;
							} else {
								throw new NodeOperationError(this.getNode(), 'Message Text must be provided.');
							}
						}

						const body: IDataObject = {};
						Object.assign(body, message);

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'',
							body,
							qs,
							uri,
							true,
						);
					}

				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			}  catch (error) {
				if (this.continueOnFail()) {
					// Return the actual reason as error
					if (operation === 'download') {
						items[i].json = { error: error.message };
					} else {
						returnData.push({ error: error.message });
					}
					continue;
				}
				throw error;
			}
		}

		if (operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output get replaced
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
