/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { Attribute, Change, Client, ClientOptions } from 'ldapts';

export class Ldap implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ldap',
		name: 'LDAP',
		icon: 'file:ldap.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + ($parameter["baseDN"] || $parameter["dn"]) }}',
		description: 'Interact with LDAP servers',
		defaults: {
			name: 'LDAP',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'ldap',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Compare',
						value: 'compare',
					},
					{
						name: 'Create',
						value: 'create',
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Modify',
						value: 'modify',
					},
					{
						name: 'Rename',
						value: 'rename',
					},
					{
						name: 'Search',
						value: 'search',
					},
				],
				default: 'search',
			},
			// ----------------------------------
			//         Common
			// ----------------------------------
			{
				displayName: 'DN',
				name: 'dn',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['compare', 'create', 'delete', 'rename', 'modify'],
					},
				},
				description: 'The DN of the entry',
			},
			// ----------------------------------
			//         Compare
			// ----------------------------------
			{
				displayName: 'Attribute ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'The attribute ID of the attribute to compare',
				required: true,
				displayOptions: {
					show: {
						operation: ['compare'],
					},
				},
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description: 'The value to compare',
				displayOptions: {
					show: {
						operation: ['compare'],
					},
				},
			},
			// ----------------------------------
			//         Rename
			// ----------------------------------
			{
				displayName: 'Target DN',
				name: 'targetDn',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['rename'],
					},
				},
				description: 'The new DN for the entry',
			},
			// ----------------------------------
			//         Create
			// ----------------------------------
			{
				displayName: 'Attributes',
				name: 'attributes',
				placeholder: 'Add Attributes',
				description: 'Add attributes to an object',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				default: {},
				options: [
					{
						name: 'attribute',
						displayName: 'Attribute',
						values: [
							{
								displayName: 'Attribute ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'The attribute ID of the attribute to add',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the attribute to set',
							},
						],
					},
				],
			},
			// ----------------------------------
			//         Modify
			// ----------------------------------
			{
				displayName: 'Modify Attribute',
				name: 'attributes',
				placeholder: 'Modify Attribute',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						operation: ['modify'],
					},
				},
				description: 'Modify object attributes',
				default: {},
				options: [
					{
						name: 'add',
						displayName: 'Add',
						values: [
							{
								displayName: 'Attribute ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'The attribute ID of the attribute to add',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the attribute to set',
							},
						],
					},
					{
						name: 'replace',
						displayName: 'Replace',
						values: [
							{
								displayName: 'Attribute ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'The attribute ID of the attribute to replace',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the attribute to replace',
							},
						],
					},
					{
						name: 'delete',
						displayName: 'Remove',
						values: [
							{
								displayName: 'Attribute ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'The attribute ID of the attribute to remove',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the attribute to remove',
							},
						],
					},
				],
			},
			// {
			// 	displayName: 'Add Attributes',
			// 	name: 'add',
			// 	placeholder: 'Add Attributes',
			// 	description: 'Add attributes to an object',
			// 	type: 'fixedCollection',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['modify'],
			// 		},
			// 	},
			// 	default: {},
			// 	options: [
			// 		{
			// 			name: 'attribute',
			// 			displayName: 'Attribute',
			// 			values: [
			// 				{
			// 					displayName: 'Attribute ID',
			// 					name: 'id',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'The attribute ID of the attribute to add',
			// 					required: true,
			// 				},
			// 				{
			// 					displayName: 'Value',
			// 					name: 'value',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'Value of the attribute to set',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
			// {
			// 	displayName: 'Replace Attributes',
			// 	name: 'replace',
			// 	placeholder: 'Replace Attributes',
			// 	description: 'Replace attributes in an object',
			// 	type: 'fixedCollection',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['modify'],
			// 		},
			// 	},
			// 	default: {},
			// 	options: [
			// 		{
			// 			name: 'attribute',
			// 			displayName: 'Attribute',
			// 			values: [
			// 				{
			// 					displayName: 'Attribute ID',
			// 					name: 'id',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'The attribute ID of the attribute to replace',
			// 					required: true,
			// 				},
			// 				{
			// 					displayName: 'Value',
			// 					name: 'value',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'New value of the attribute to set',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
			// {
			// 	displayName: 'Remove Attributes',
			// 	name: 'remove',
			// 	placeholder: 'Remove Attributes',
			// 	description: 'Remove attributes in an object',
			// 	type: 'fixedCollection',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['modify'],
			// 		},
			// 	},
			// 	default: {},
			// 	options: [
			// 		{
			// 			name: 'attribute',
			// 			displayName: 'Attribute',
			// 			values: [
			// 				{
			// 					displayName: 'Attribute ID',
			// 					name: 'id',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'The attribute ID of the attribute to replace',
			// 					required: true,
			// 				},
			// 				{
			// 					displayName: 'Value',
			// 					name: 'value',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'New value of the attribute to set',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
			// ----------------------------------
			//         Search
			// ----------------------------------
			{
				displayName: 'Base DN',
				name: 'baseDN',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'The subtree to search in',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '(objectclass=*)',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: `LDAP filter. Escape these chars * ( ) \\ with a backslash '\\'.`,
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						operation: ['search'],
						returnAll: [false],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				options: [
					{
						displayName: 'Attributes',
						name: 'attributes',
						type: 'string',
						default: '',
						description: 'Comma-separated list of attributes to return',
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						default: 1000,
						typeOptions: {
							minValue: 0,
						},
						description:
							'Maximum number of results to request at one time. Set to 0 to disable paging.',
					},
					{
						displayName: 'Scope',
						name: 'scope',
						default: 'sub',
						description:
							'The set of entries at or below the BaseDN that may be considered potential matches',
						type: 'options',
						options: [
							{
								name: 'Base Object',
								value: 'base',
							},
							{
								name: 'Single Level',
								value: 'one',
							},
							{
								name: 'Whole Subtree',
								value: 'sub',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnItems: INodeExecutionData[] = [];

		let item: INodeExecutionData;

		const credentials = await this.getCredentials('ldap');
		const protocol = !credentials.secure || credentials.starttls ? 'ldap' : 'ldaps';
		let port = !credentials.secure || credentials.starttls ? 389 : 686;
		port = credentials.port ? (credentials.port as number) : port;
		const url = `${protocol}://${credentials.hostname}:${port}`;
		const bindDN = credentials.bindDN as string;
		const bindPassword = credentials.bindPassword as string;

		const ldapOptions: ClientOptions = { url };
		const tlsOptions: IDataObject = {};

		if (credentials.secure) {
			tlsOptions.rejectUnauthorized = credentials.allowUnauthorizedCerts === false;
			if (credentials.caCertificate) {
				tlsOptions.ca = [credentials.caCertificate as string];
			}
			if (!credentials.starttls) {
				ldapOptions.tlsOptions = tlsOptions;
			}
		}

		const client = new Client(ldapOptions);

		try {
			if (credentials.starttls) {
				await client.startTLS(tlsOptions);
			}
			await client.bind(bindDN, bindPassword);
		} catch (error) {
			// console.log(`error: ${JSON.stringify(Object.keys(error.cert.issuerCertificate), null, 2)}`);
			delete error.cert;
			// console.log(`error: ${JSON.stringify(error)}`);
			if (this.continueOnFail()) {
				return [
					items.map((x) => {
						x.json.error = error.reason || 'LDAP connection error occurred';
						return x;
					}),
				];
			} else {
				throw new NodeOperationError(this.getNode(), error, {});
			}
		}

		// console.log(`client: ${JSON.stringify(client)}`);

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				item = items[itemIndex];
				if (operation === 'compare') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;
					const attributeId = this.getNodeParameter('id', itemIndex) as string;
					const value = this.getNodeParameter('value', itemIndex, '') as string;

					const res = await client.compare(dn, attributeId, value);

					returnItems.push({
						json: { dn, attribute: attributeId, result: res },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'create') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;
					const attributeFields = this.getNodeParameter('attributes', itemIndex) as IDataObject;

					const attributes: IDataObject = {};

					if (Object.keys(attributeFields).length) {
						//@ts-ignore
						attributeFields.attribute.map((attr) => {
							attributes[attr.id as string] = attr.value;
						});
					}

					//@ts-ignore
					const res = await client.add(dn, attributes);

					returnItems.push({
						json: { dn, result: 'success' },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'delete') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;

					const res = await client.del(dn);

					returnItems.push({
						json: { dn, result: 'success' },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'rename') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;
					const targetDn = this.getNodeParameter('targetDn', itemIndex) as string;

					const res = await client.modifyDN(dn, targetDn);

					returnItems.push({
						json: { dn: targetDn, result: 'success' },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'modify') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;
					const attributes = this.getNodeParameter('attributes', itemIndex, {}) as IDataObject;
					// const addAttributes = this.getNodeParameter('add', itemIndex) as IDataObject;
					// const replaceAttributes = this.getNodeParameter('replace', itemIndex) as IDataObject;
					// const removeAttributes = this.getNodeParameter('remove', itemIndex) as IDataObject;

					const changes: Change[] = [];

					for (const [action, attrs] of Object.entries(attributes)) {
						//@ts-ignore
						attrs.map((attr) =>
							changes.push(
								new Change({
									// @ts-ignore
									operation: action,
									modification: new Attribute({
										type: attr.id as string,
										values: [attr.value],
									}),
								}),
							),
						);
					}

					// //@ts-ignore
					// for (const attribute of addAttributes.attribute || []) {
					// 	changes.push(new Change({
					// 		operation: 'add',
					// 		modification: new Attribute({
					// 			type: attribute.id as string,
					// 			values: [attribute.value],
					// 		}),
					// 	}));
					// }

					// //@ts-ignore
					// for (const attribute of replaceAttributes.attribute || []) {
					// 	changes.push(new Change({
					// 		operation: 'replace',
					// 		modification: new Attribute({
					// 			type: attribute.id as string,
					// 			values: [attribute.value],
					// 		}),
					// 	}));
					// }

					// //@ts-ignore
					// for (const attribute of removeAttributes.attribute || []) {
					// 	changes.push(new Change({
					// 		operation: 'delete',
					// 		modification: new Attribute({
					// 			type: attribute.id as string,
					// 			values: [attribute.value],
					// 		}),
					// 	}));
					// }

					// console.log(`changes: ${JSON.stringify(changes, null, 2)}`);

					const res = await client.modify(dn, changes);

					returnItems.push({
						json: { dn, result: 'success', changes },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'search') {
					// const ldapSearch = promisify(client.search);
					const baseDN = this.getNodeParameter('baseDN', itemIndex) as string;
					let filter = this.getNodeParameter('filter', itemIndex) as string;
					const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
					const limit = this.getNodeParameter('limit', itemIndex, 0) as number;
					const options = this.getNodeParameter('options', itemIndex) as IDataObject;
					const pageSize = this.getNodeParameter(
						'options.pageSize',
						itemIndex,
						1000,
					) as IDataObject;

					// Set paging settings
					delete options.pageSize;
					options.sizeLimit = returnAll ? 0 : limit;
					if (pageSize) {
						options.paged = { pageSize };
					}

					// Set attributes to retreive
					options.attributes = options.attributes ? (options.attributes as string).split(',') : [];

					// Replace escaped filter special chars for ease of use
					// Character       ASCII value
					// ---------------------------
					// *               0x2a
					// (               0x28
					// )               0x29
					// \               0x5c
					filter = filter.replace(/\\\\/g, '\\5c');
					filter = filter.replace(/\\\*/g, '\\2a');
					filter = filter.replace(/\\\(/g, '\\28');
					filter = filter.replace(/\\\)/g, '\\29');
					options.filter = filter;

					const results = await client.search(baseDN, options);

					// Not all LDAP servers respect the sizeLimit
					if (!returnAll) {
						results.searchEntries = results.searchEntries.slice(0, limit);
					}

					returnItems.push.apply(
						returnItems,
						results.searchEntries.map((result) => ({
							json: result,
							pairedItem: { item: itemIndex },
						})),
					);
				}
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				// console.log(`ERROR: ${error}`);
				if (this.continueOnFail()) {
					// returnItems.push({ json: {error, result: 'error'}, pairedItem: itemIndex });
					returnItems.push({ json: items[itemIndex].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		// await client.unbind();
		return this.prepareOutputData(returnItems);
	}
}
