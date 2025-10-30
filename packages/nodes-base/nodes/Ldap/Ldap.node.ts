import { Attribute, Change } from 'ldapts';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { BINARY_AD_ATTRIBUTES, createLdapClient, resolveBinaryAttributes } from './Helpers';
import { ldapFields } from './LdapDescription';

export class Ldap implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ldap',
		name: 'ldap',
		icon: { light: 'file:ldap.svg', dark: 'file:ldap.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with LDAP servers',
		defaults: {
			name: 'LDAP',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'ldap',
				required: true,
				testedBy: 'ldapConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Compare',
						value: 'compare',
						description: 'Compare an attribute',
						action: 'Compare an attribute',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new entry',
						action: 'Create a new entry',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry',
						action: 'Delete an entry',
					},
					{
						name: 'Rename',
						value: 'rename',
						description: 'Rename the DN of an existing entry',
						action: 'Rename the DN of an existing entry',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search LDAP',
						action: 'Search LDAP',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update attributes',
						action: 'Update attributes',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Debug',
				name: 'nodeDebug',
				type: 'boolean',
				isNodeSetting: true,
				default: false,
				noDataExpression: true,
			},
			...ldapFields,
		],
	};

	methods = {
		credentialTest: {
			async ldapConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;
				const client = await createLdapClient(this, credentials);
				try {
					await client.bind(credentials.bindDN as string, credentials.bindPassword as string);
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				} finally {
					await client.unbind();
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
		loadOptions: {
			async getAttributes(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('ldap');
				const client = await createLdapClient(this, credentials);

				try {
					await client.bind(credentials.bindDN as string, credentials.bindPassword as string);
				} catch (error) {
					await client.unbind();
					this.logger.error(error);
					return [];
				}

				let results;
				const baseDN = this.getNodeParameter('baseDN', 0) as string;
				try {
					results = await client.search(baseDN, { sizeLimit: 200, paged: false }); // should this size limit be set in credentials?
				} catch (error) {
					this.logger.error(error);
					return [];
				} finally {
					await client.unbind();
				}

				const unique = Object.keys(Object.assign({}, ...results.searchEntries));
				return unique.map((x) => ({
					name: x,
					value: x,
				}));
			},

			async getObjectClasses(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('ldap');
				const client = await createLdapClient(this, credentials);
				try {
					await client.bind(credentials.bindDN as string, credentials.bindPassword as string);
				} catch (error) {
					await client.unbind();
					this.logger.error(error);
					return [];
				}

				const baseDN = this.getNodeParameter('baseDN', 0) as string;

				let results;
				try {
					results = await client.search(baseDN, { sizeLimit: 10, paged: false }); // should this size limit be set in credentials?
				} catch (error) {
					this.logger.error(error);
					return [];
				} finally {
					await client.unbind();
				}

				const objects = [];
				for (const entry of results.searchEntries) {
					if (typeof entry.objectClass === 'string') {
						objects.push(entry.objectClass);
					} else {
						objects.push(...entry.objectClass);
					}
				}

				const unique = [...new Set(objects)];
				unique.push('custom');
				const result = [];
				for (const value of unique) {
					if (value === 'custom') {
						result.push({ name: 'custom', value: 'custom' });
					} else result.push({ name: value as string, value: `(objectclass=${value})` });
				}
				return result;
			},

			async getAttributesForDn(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('ldap');
				const client = await createLdapClient(this, credentials);

				try {
					await client.bind(credentials.bindDN as string, credentials.bindPassword as string);
				} catch (error) {
					await client.unbind();
					this.logger.error(error);
					return [];
				}

				let results;
				const baseDN = this.getNodeParameter('dn', 0) as string;
				try {
					results = await client.search(baseDN, { sizeLimit: 1, paged: false });
				} catch (error) {
					this.logger.error(error);
					return [];
				} finally {
					await client.unbind();
				}

				const unique = Object.keys(Object.assign({}, ...results.searchEntries));
				return unique.map((x) => ({
					name: x,
					value: x,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const nodeDebug = this.getNodeParameter('nodeDebug', 0) as boolean;

		const items = this.getInputData();
		const returnItems: INodeExecutionData[] = [];

		if (nodeDebug) {
			this.logger.info(
				`[${this.getNode().type} | ${this.getNode().name}] - Starting with ${
					items.length
				} input items`,
			);
		}

		const credentials = await this.getCredentials('ldap');
		const client = await createLdapClient(
			this,
			credentials,
			nodeDebug,
			this.getNode().type,
			this.getNode().name,
		);

		try {
			await client.bind(credentials.bindDN as string, credentials.bindPassword as string);
		} catch (error) {
			delete error.cert;
			await client.unbind();
			if (this.continueOnFail()) {
				return [
					items.map((x) => {
						x.json.error = error.reason || 'LDAP connection error occurred';
						return x;
					}),
				];
			} else {
				throw new NodeOperationError(this.getNode(), error as Error, {});
			}
		}

		const operation = this.getNodeParameter('operation', 0);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
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

					await client.add(dn, attributes as unknown as Attribute[]);

					returnItems.push({
						json: { dn, result: 'success' },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'delete') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;

					await client.del(dn);

					returnItems.push({
						json: { dn, result: 'success' },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'rename') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;
					const targetDn = this.getNodeParameter('targetDn', itemIndex) as string;

					await client.modifyDN(dn, targetDn);

					returnItems.push({
						json: { dn: targetDn, result: 'success' },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'update') {
					const dn = this.getNodeParameter('dn', itemIndex) as string;
					const attributes = this.getNodeParameter('attributes', itemIndex, {}) as IDataObject;
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

					await client.modify(dn, changes);

					returnItems.push({
						json: { dn, result: 'success', changes },
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'search') {
					const baseDN = this.getNodeParameter('baseDN', itemIndex) as string;
					let searchFor = this.getNodeParameter('searchFor', itemIndex) as string;
					const returnAll = this.getNodeParameter('returnAll', itemIndex);
					const limit = this.getNodeParameter('limit', itemIndex, 0);
					const options = this.getNodeParameter('options', itemIndex);
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

					// Set attributes to retrieve
					if (typeof options.attributes === 'string') {
						options.attributes = options.attributes.split(',').map((attribute) => attribute.trim());
					}
					options.explicitBufferAttributes = BINARY_AD_ATTRIBUTES;

					if (searchFor === 'custom') {
						searchFor = this.getNodeParameter('customFilter', itemIndex) as string;
					} else {
						const searchText = this.getNodeParameter('searchText', itemIndex) as string;
						const attribute = this.getNodeParameter('attribute', itemIndex) as string;
						searchFor = `(&${searchFor}(${attribute}=${searchText}))`;
					}

					// Replace escaped filter special chars for ease of use
					// Character       ASCII value
					// ---------------------------
					// *               0x2a
					// (               0x28
					// )               0x29
					// \               0x5c
					searchFor = searchFor.replace(/\\\\/g, '\\5c');
					searchFor = searchFor.replace(/\\\*/g, '\\2a');
					searchFor = searchFor.replace(/\\\(/g, '\\28');
					searchFor = searchFor.replace(/\\\)/g, '\\29');
					options.filter = searchFor;

					if (nodeDebug) {
						this.logger.info(
							`[${this.getNode().type} | ${this.getNode().name}] - Search Options ${JSON.stringify(
								options,
								null,
								2,
							)}`,
						);
					}

					const results = await client.search(baseDN, options);

					// Not all LDAP servers respect the sizeLimit
					if (!returnAll) {
						results.searchEntries = results.searchEntries.slice(0, limit);
					}
					resolveBinaryAttributes(results.searchEntries);

					returnItems.push.apply(
						returnItems,
						results.searchEntries.map((result) => ({
							json: result,
							pairedItem: { item: itemIndex },
						})),
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({ json: items[itemIndex].json, error, pairedItem: itemIndex });
				} else {
					await client.unbind();
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex,
					});
				}
			}
		}
		if (nodeDebug) {
			this.logger.info(`[${this.getNode().type} | ${this.getNode().name}] - Finished`);
		}

		await client.unbind();

		return [returnItems];
	}
}
