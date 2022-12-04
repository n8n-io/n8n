import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { countriesCodes } from './CountriesCodes';

import { conversationFields, conversationOperations } from './ConversationDescription';

import { customerFields, customerOperations } from './CustomerDescription';

import { ICustomer } from './CustomerInterface';

import { IConversation } from './ConversationInterface';

import { helpscoutApiRequest, helpscoutApiRequestAllItems } from './GenericFunctions';

import { mailboxFields, mailboxOperations } from './MailboxDescription';

import { threadFields, threadOperations } from './ThreadDescription';

import { IAttachment, IThread } from './ThreadInterface';

export class HelpScout implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HelpScout',
		name: 'helpScout',
		icon: 'file:helpScout.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume HelpScout API',
		defaults: {
			name: 'HelpScout',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'helpScoutOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Conversation',
						value: 'conversation',
					},
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Mailbox',
						value: 'mailbox',
					},
					{
						name: 'Thread',
						value: 'thread',
					},
				],
				default: 'conversation',
			},
			...conversationOperations,
			...conversationFields,
			...customerOperations,
			...customerFields,
			...mailboxOperations,
			...mailboxFields,
			...threadOperations,
			...threadFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the countries codes to display them to user so that he can
			// select them easily
			async getCountriesCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const countryCode of countriesCodes) {
					const countryCodeName = `${countryCode.name} - ${countryCode.alpha2}`;
					const countryCodeId = countryCode.alpha2;
					returnData.push({
						name: countryCodeName,
						value: countryCodeId,
					});
				}
				return returnData;
			},
			// Get all the tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await helpscoutApiRequestAllItems.call(
					this,
					'_embedded.tags',
					'GET',
					'/v2/tags',
				);
				for (const tag of tags) {
					const tagName = tag.name;
					const _tagId = tag.id;
					returnData.push({
						name: tagName,
						value: tagName,
					});
				}
				return returnData;
			},
			// Get all the mailboxes to display them to user so that he can
			// select them easily
			async getMailboxes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const mailboxes = await helpscoutApiRequestAllItems.call(
					this,
					'_embedded.mailboxes',
					'GET',
					'/v2/mailboxes',
				);
				for (const mailbox of mailboxes) {
					const mailboxName = mailbox.name;
					const mailboxId = mailbox.id;
					returnData.push({
						name: mailboxName,
						value: mailboxId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'conversation') {
					//https://developer.helpscout.com/mailbox-api/endpoints/conversations/create
					if (operation === 'create') {
						const mailboxId = this.getNodeParameter('mailboxId', i) as number;
						const status = this.getNodeParameter('status', i) as string;
						const subject = this.getNodeParameter('subject', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const resolveData = this.getNodeParameter('resolveData', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const threads = (this.getNodeParameter('threadsUi', i) as IDataObject)
							.threadsValues as IDataObject[];
						const body: IConversation = {
							mailboxId,
							status,
							subject,
							type,
						};
						Object.assign(body, additionalFields);
						if (additionalFields.customerId) {
							body.customer = {
								id: additionalFields.customerId,
							};
							//@ts-ignore
							delete body.customerId;
						}
						if (additionalFields.customerEmail) {
							body.customer = {
								email: additionalFields.customerEmail,
							};
							//@ts-ignore
							delete body.customerEmail;
						}
						if (body.customer === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								'Either customer email or customer ID must be set',
								{ itemIndex: i },
							);
						}
						if (threads) {
							for (let index = 0; index < threads.length; index++) {
								if (threads[index].type === '' || threads[index].text === '') {
									throw new NodeOperationError(this.getNode(), 'Chat Threads cannot be empty');
								}
								if (threads[index].type !== 'note') {
									threads[index].customer = body.customer;
								}
							}
							body.threads = threads;
						}
						responseData = await helpscoutApiRequest.call(
							this,
							'POST',
							'/v2/conversations',
							body,
							qs,
							undefined,
							{ resolveWithFullResponse: true },
						);
						const id = responseData.headers['resource-id'];
						const uri = responseData.headers.location;
						if (resolveData) {
							responseData = await helpscoutApiRequest.call(this, 'GET', '', {}, {}, uri);
						} else {
							responseData = {
								id,
								uri,
							};
						}
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/conversations/delete
					if (operation === 'delete') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						responseData = await helpscoutApiRequest.call(
							this,
							'DELETE',
							`/v2/conversations/${conversationId}`,
						);
						responseData = { success: true };
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/conversations/get
					if (operation === 'get') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						responseData = await helpscoutApiRequest.call(
							this,
							'GET',
							`/v2/conversations/${conversationId}`,
						);
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/conversations/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						Object.assign(qs, options);
						if (returnAll) {
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.conversations',
								'GET',
								'/v2/conversations',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.conversations',
								'GET',
								'/v2/conversations',
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
				if (resource === 'customer') {
					//https://developer.helpscout.com/mailbox-api/endpoints/customers/create
					if (operation === 'create') {
						const resolveData = this.getNodeParameter('resolveData', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const chats = (this.getNodeParameter('chatsUi', i) as IDataObject)
							.chatsValues as IDataObject[];
						const address = (this.getNodeParameter('addressUi', i) as IDataObject)
							.addressValue as IDataObject;
						const emails = (this.getNodeParameter('emailsUi', i) as IDataObject)
							.emailsValues as IDataObject[];
						const phones = (this.getNodeParameter('phonesUi', i) as IDataObject)
							.phonesValues as IDataObject[];
						const socialProfiles = (this.getNodeParameter('socialProfilesUi', i) as IDataObject)
							.socialProfilesValues as IDataObject[];
						const websites = (this.getNodeParameter('websitesUi', i) as IDataObject)
							.websitesValues as IDataObject[];
						let body: ICustomer = {};
						body = Object.assign({}, additionalFields);
						if (body.age) {
							body.age = body.age.toString();
						}
						if (chats) {
							body.chats = chats;
						}
						if (address) {
							body.address = address;
							body.address.lines = [address.line1, address.line2];
						}
						if (emails) {
							body.emails = emails;
						}
						if (phones) {
							body.phones = phones;
						}
						if (socialProfiles) {
							body.socialProfiles = socialProfiles;
						}
						if (websites) {
							body.websites = websites;
						}
						if (Object.keys(body).length === 0) {
							throw new NodeOperationError(this.getNode(), 'You have to set at least one field', {
								itemIndex: i,
							});
						}
						responseData = await helpscoutApiRequest.call(
							this,
							'POST',
							'/v2/customers',
							body,
							qs,
							undefined,
							{ resolveWithFullResponse: true },
						);
						const id = responseData.headers['resource-id'];
						const uri = responseData.headers.location;
						if (resolveData) {
							responseData = await helpscoutApiRequest.call(this, 'GET', '', {}, {}, uri);
						} else {
							responseData = {
								id,
								uri,
							};
						}
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/customer_properties/list
					if (operation === 'properties') {
						responseData = await helpscoutApiRequestAllItems.call(
							this,
							'_embedded.customer-properties',
							'GET',
							'/v2/customer-properties',
							{},
							qs,
						);
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/customers/get
					if (operation === 'get') {
						const customerId = this.getNodeParameter('customerId', i) as string;
						responseData = await helpscoutApiRequest.call(
							this,
							'GET',
							`/v2/customers/${customerId}`,
						);
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/customers/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						Object.assign(qs, options);
						if (returnAll) {
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.customers',
								'GET',
								'/v2/customers',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.customers',
								'GET',
								'/v2/customers',
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/customers/overwrite/
					if (operation === 'update') {
						const customerId = this.getNodeParameter('customerId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						let body: ICustomer = {};
						body = Object.assign({}, updateFields);
						if (body.age) {
							body.age = body.age.toString();
						}
						if (Object.keys(body).length === 0) {
							throw new NodeOperationError(this.getNode(), 'You have to set at least one field', {
								itemIndex: i,
							});
						}
						responseData = await helpscoutApiRequest.call(
							this,
							'PUT',
							`/v2/customers/${customerId}`,
							body,
							qs,
							undefined,
							{ resolveWithFullResponse: true },
						);
						responseData = { success: true };
					}
				}
				if (resource === 'mailbox') {
					//https://developer.helpscout.com/mailbox-api/endpoints/mailboxes/get
					if (operation === 'get') {
						const mailboxId = this.getNodeParameter('mailboxId', i) as string;
						responseData = await helpscoutApiRequest.call(
							this,
							'GET',
							`/v2/mailboxes/${mailboxId}`,
							{},
							qs,
						);
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/mailboxes/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.mailboxes',
								'GET',
								'/v2/mailboxes',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.mailboxes',
								'GET',
								'/v2/mailboxes',
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
				if (resource === 'thread') {
					//https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/chat
					if (operation === 'create') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const _type = this.getNodeParameter('type', i) as string;
						const text = this.getNodeParameter('text', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const attachments = this.getNodeParameter('attachmentsUi', i) as IDataObject;
						const body: IThread = {
							text,
							attachments: [],
						};
						Object.assign(body, additionalFields);
						if (additionalFields.customerId) {
							body.customer = {
								id: additionalFields.customerId,
							};
							//@ts-ignore
							delete body.customerId;
						}
						if (additionalFields.customerEmail) {
							body.customer = {
								email: additionalFields.customerEmail,
							};
							//@ts-ignore
							delete body.customerEmail;
						}
						if (body.customer === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								'Either customer email or customer ID must be set',
								{ itemIndex: i },
							);
						}
						if (attachments) {
							if (
								attachments.attachmentsValues &&
								(attachments.attachmentsValues as IDataObject[]).length !== 0
							) {
								body.attachments?.push.apply(
									body.attachments,
									attachments.attachmentsValues as IAttachment[],
								);
							}
							if (
								attachments.attachmentsBinary &&
								(attachments.attachmentsBinary as IDataObject[]).length !== 0 &&
								items[i].binary
							) {
								const mapFunction = (value: IDataObject): IAttachment => {
									const binaryProperty = (items[i].binary as IBinaryKeyData)[
										value.property as string
									];
									if (binaryProperty) {
										return {
											fileName: binaryProperty.fileName || 'unknown',
											data: binaryProperty.data,
											mimeType: binaryProperty.mimeType,
										};
									} else {
										throw new NodeOperationError(
											this.getNode(),
											`Binary property ${value.property} does not exist on input`,
											{ itemIndex: i },
										);
									}
								};
								body.attachments?.push.apply(
									body.attachments,
									(attachments.attachmentsBinary as IDataObject[]).map(mapFunction),
								);
							}
						}
						responseData = await helpscoutApiRequest.call(
							this,
							'POST',
							`/v2/conversations/${conversationId}/chats`,
							body,
						);
						responseData = { success: true };
					}
					//https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						if (returnAll) {
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.threads',
								'GET',
								`/v2/conversations/${conversationId}/threads`,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await helpscoutApiRequestAllItems.call(
								this,
								'_embedded.threads',
								'GET',
								`/v2/conversations/${conversationId}/threads`,
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
