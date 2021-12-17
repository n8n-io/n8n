import { IExecuteFunctions } from 'n8n-core';
import {
	IContextObject, IDataObject,
	INodeExecutionData, INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {sendinblueApiRequest} from './GenericFunctions';
import {contactActions, contactFields, contactOptions} from './ContactDescription';
import {
	transactionalEMailActions,
	transactionalEMailFields,
	transactionalEMailOptions,
} from './TransactionalEMailDescription';
import {contactListActions, contactListFields, contactListOptions} from './ContactListDescription';


export class Sendinblue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sendinblue',
		name: 'sendinblue',
		icon: 'file:sendinblue.png',
		group: ['transform'],
		version: 1,
		description: 'Connect to Sendinblue API',
		defaults: {
			name: 'Sendinblue',
			color: '#0092FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sendinblue',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'apiResource',
				type: 'options',
				options: [
					{
						name: 'Transactional emails',
						value: 'transactionalEMails',
					},
					{
						name: 'Contacts',
						value: 'contacts',
					},
					{
						name: 'Contact Lists',
						value: 'contactLists',
					},
				],
				default: '',
				description: 'The part of the Sendinblue API to call operations from',
				required: true,
			},
			...transactionalEMailActions,
			...transactionalEMailFields,
			...transactionalEMailOptions,
			...contactActions,
			...contactFields,
			...contactOptions,
			...contactListActions,
			...contactListFields,
			...contactListOptions,
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		let item: INodeExecutionData;
		let method = 'GET';
		const returnData: IDataObject[] = [];

		let apiResource: string;
		let apiCall = '';
		let templateId: number;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = items[itemIndex];

			const action = this.getNodeParameter('action', itemIndex, '') as string;
			switch (action) {
				case   'create':method = 'POST';break;
				case   'update':method = 'PUT';break;
				case   'delete':method = 'delete';break;
				case      'get':
						default:method = 'GET';
			}
			const options = this.getNodeParameter('options', itemIndex) as IDataObject;

			apiResource = this.getNodeParameter('apiResource', itemIndex, '') as string;
			const body: IContextObject = {};

			// transactional emails
			if ('transactionalEMails' === apiResource && 'send' === action) {
				method = 'POST';
				apiCall = 'smtp/email';
				const receivers = this.getNodeParameter('receivers', itemIndex, {}) as IDataObject;
				const params = options.params as INodeParameters;
				let paramsPropertyName: string;
				const tags = options.tags;
				const attachmentPropertyString = options.attachments as string;
				const attachmentListPropertyString = options.attachments_list as string;
				//const headers = options.headers as INodeParameters;

				if (receivers.to === undefined || !Array.isArray(receivers.to) || receivers.to.length === 0) {
					throw new Error(`Missing "to" data in receivers!`);
				}
				body.to = receivers.to;

				if (receivers.cc !== undefined && Array.isArray(receivers.cc) && receivers.cc.length > 0) {
					body.cc = receivers.cc;
				}

				if (receivers.bcc !== undefined && Array.isArray(receivers.bcc) && receivers.bcc.length > 0) {
					body.bcc = receivers.bcc;
				}

				templateId = options.templateId as number;
				if (undefined !== templateId) {
					body.templateId = templateId;
				}

				// params by collection
				if (params !== undefined && params.param !== undefined &&
					Array.isArray(params.param) && params.param.length > 0)
				{
					body.params = {};
					for (let i = 0; i < params.param.length; i++) {
						const p = params.param[i] as IDataObject;
						if (typeof (p.key) === 'string' && typeof (p.value) === 'string') {
							body.params[p.key as string] = p.value as string;
						}
					}
				}

				// params by property name
				if (options.params_property_name !== undefined) {
					if (body.params === undefined) {
						body.params = {};
					}
					paramsPropertyName = options.params_property_name as string;
					if (item.json[paramsPropertyName] === undefined) {
						throw new Error(`No property named "${paramsPropertyName}" exists for "params"!`);
					}
					Object.assign(body.params, item.json[paramsPropertyName]);
				}

				if (tags !== undefined) {
					if (Array.isArray(tags) && tags.length > 0) {
						body.tags = tags;
					} else if (typeof (tags) === 'string') {
						body.tags = tags.split(',');
					} else {
						throw new Error(`Tags have to be an array of string or a string in csv format!`);
					}
					if (body.tags.length === 0) {
						delete body.tags;
					} else {
						body.tags = body.tags.map((tag: string) => tag.trim());
					}
				}

				if (attachmentPropertyString && item.binary) {
					const attachments = [];
					const attachmentProperties: string[] = attachmentPropertyString.split(',').map((propertyName) => {
						return propertyName.trim();
					});

					for (const propertyName of attachmentProperties) {
						if (!item.binary.hasOwnProperty(propertyName)) {
							continue;
						}
						attachments.push({
							name: item.binary[propertyName].fileName || 'unknown',
							content: item.binary[propertyName].data,
						});
					}

					if (attachments.length) {
						body.attachment = attachments;
					}
				}

				if (attachmentListPropertyString) {
					const attachmentData = item.json[attachmentListPropertyString] as object[];
					if (attachmentData.length) {
						for (const attachment of attachmentData) {
							// @ts-ignore
							if (!attachment.url) {
								throw new Error('Parameter "url" not set in attachment property.');
							}
							// @ts-ignore
							if (!attachment.name) {
								throw new Error('Parameter "name" not set in attachment property.');
							}
						}
						body.attachment = attachmentData;
					}
				}

				// @todo There seems to be a bug in Sendinblue, the headers aren't sent in the mails.
				// if (headers.header !== undefined && Array.isArray(headers.header) && headers.header.length > 0) {
				// 	body.headers = {};
				// 	for (let i = 0; i < headers.header.length; i++) {
				// 		const h = headers.header[i] as IDataObject;
				// 		if (typeof (h.key) === 'string' && typeof (h.value) === 'string') {
				// 			body.headers[h.key as string] = h.value as string;
				// 		}
				// 	}
				// }
			}

			// contacts
			if ('contacts' === apiResource) {
				let email: string;

				// CRUD for contacts
				if (['create', 'get', 'update', 'delete'].includes(action)) {
					email = this.getNodeParameter('email', itemIndex, '') as string;
					if (email === undefined) {
						throw new Error('Missing value to mandatory field "email"!');
					}

					apiCall = 'contacts/' + encodeURIComponent(email);
					if ('create' === action) {
						apiCall = 'contacts';

						if (undefined !== options.updateEnabled) {
							body.updateEnabled = options.updateEnabled as boolean;
						}
						body.email = email;
					}

					if (['create', 'update'].includes(action) && undefined !== options.attributes) {
						const attributes = options.attributes as string;
						if (item.json[attributes] === undefined) {
							throw new Error(`No property named "${attributes}" exists for "attributes"!`);
						}
						body.attributes = item.json[attributes];
					}
				}

				// add contact to list
				if (['addToList', 'removeFromList'].includes(action)) {
					method = 'POST';
					const listId = this.getNodeParameter('listId', itemIndex) as string;
					if (listId === undefined) {
						throw new Error('Missing value to mandatory field "List ID"!');
					}

					apiCall = `contacts/lists/${listId}/contacts/`;
					if ('addToList' === action) {
						apiCall += 'add';
					} else if ('removeFromList' === action) {
						apiCall += 'remove';
					}

					const emailAddresses = this.getNodeParameter('emailAddresses', itemIndex, {}) as string;
					if (item.json[emailAddresses] === undefined) {
						throw new Error(`No property named "${emailAddresses}" exists for "eMail Addresses Property Name"!`);
					}
					if (!Array.isArray(item.json[emailAddresses])) {
						throw new Error(`Value of property named "${emailAddresses}" has to be an array!`);
					}
					const emailAddressesArray = item.json[emailAddresses] as string[];
					if (emailAddressesArray.length === 0) {
						throw new Error(`No email addresses given in property named "${emailAddresses}"!`);
					}
					body.emails = item.json[emailAddresses];
				}
			}

			// contact lists
			if ('contactLists' === apiResource) {
				apiCall = 'contacts/lists';

				// CRUD for contact lists
				if (action === 'create') {
					const listName = this.getNodeParameter('listName', itemIndex) as string;
					if (listName === undefined) {
						throw new Error('Missing value to mandatory field "List Name"!');
					}
					body.name = listName;

					const folderId = this.getNodeParameter('folderId', itemIndex) as number;
					if (folderId === undefined) {
						throw new Error('Missing value to mandatory field "Folder ID"!');
					}
					body.folderId = folderId;

				}
				if (['get', 'update', 'delete'].includes(action)) {
					const listId = this.getNodeParameter('listId', itemIndex) as number;
					if (listId === undefined) {
						throw new Error('Missing value to mandatory field "List ID"!');
					}

					apiCall = 'contacts/lists/' + listId;
					if ('update' === action) {
						const listName = options.listName as string;
						const folderId = options.folderId as number;
						if (listName === undefined && folderId === undefined) {
							throw new Error(`One of the options "listName" and "folderId" has to be set!`);
						}
						if (listName !== undefined && folderId !== undefined) {
							throw new Error(`Only one of the options "listName" and "folderId" can be set at once!`);
						}

						if (listName !== undefined) {
							body.name = listName;
						} else if (folderId !== undefined) {
							body.folderId = folderId;
						}
					}
				}
			}

			if ('' !== apiCall) {
				try {
					const responseData = await sendinblueApiRequest.call(this, method, apiCall, body);

					returnData.push(responseData as IDataObject);
				} catch (error) {
					returnData.push(error as IDataObject);
				}
			}

		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
