/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { Attribute, Change, Client, ClientOptions } from 'ldapts';
import { ldapFields } from './LdapDescription';

export class Ldap implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ldap',
		name: 'LDAP',
		icon: 'file:ldap.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
				try {
					const protocol = !credentials.secure || credentials.starttls ? 'ldap' : 'ldaps';
					const url = `${protocol}://${credentials.hostname}:${credentials.port}`;

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
					if (credentials.starttls) {
						await client.startTLS(tlsOptions);
					}
					await client.bind(credentials.bindDN as string, credentials.bindPassword as string);
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
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
			delete error.cert;
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
				} else if (operation === 'modify') {
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

					if (filter === 'custom') {
						filter = this.getNodeParameter('customFilter', itemIndex) as string;
					}

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
				if (this.continueOnFail()) {
					returnItems.push({ json: items[itemIndex].json, error, pairedItem: itemIndex });
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(returnItems);
	}
}
