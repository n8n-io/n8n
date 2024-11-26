import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';

import { groupFields, groupOperations, userFields, userOperations } from './descriptions';
import { microsoftApiRequest } from './GenericFunctions';

export class MicrosoftEntra implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Entra ID',
		name: 'microsoftEntra',
		icon: {
			light: 'file:microsoftEntra.svg',
			dark: 'file:microsoftEntra.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Micosoft Entra ID API',
		defaults: {
			name: 'Micosoft Entra ID',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'microsoftEntraOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://graph.microsoft.com/v1.0',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
			},

			...groupOperations,
			...groupFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			async getGroupProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const response = await microsoftApiRequest.call(this, 'GET', '/$metadata#groups');
				const metadata = await parseStringPromise(response as string, {
					explicitArray: false,
				});
				/* eslint-disable */
				const entities = metadata['edmx:Edmx']['edmx:DataServices']['Schema']
					.find((x: any) => x['$']['Namespace'] === 'microsoft.graph')
					['EntityType'].filter((x: any) =>
						['entity', 'directoryObject', 'group'].includes(x['$']['Name']),
					);
				let properties = entities
					.flatMap((x: any) => x['Property'])
					.map((x: any) => x['$']['Name']) as string[];
				/* eslint-enable */

				properties = properties.filter(
					(x) => !['id', 'isArchived', 'hasMembersWithLicenseErrors'].includes(x),
				);

				const operation = this.getCurrentNodeParameter('operation');
				if (operation === 'getAll') {
					// Not all groups support these properties
					properties = properties.filter(
						(x) =>
							![
								'allowExternalSenders',
								'autoSubscribeNewMembers',
								'hideFromAddressLists',
								'hideFromOutlookClients',
								'isSubscribedByMail',
								'unseenCount',
							].includes(x),
					);
				}

				properties = properties.sort();

				for (const property of properties) {
					returnData.push({
						name: property,
						value: property,
					});
				}
				return returnData;
			},

			async getUserProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const response = await microsoftApiRequest.call(this, 'GET', '/$metadata#users');
				const metadata = await parseStringPromise(response as string, {
					explicitArray: false,
				});

				/* eslint-disable */
				const entities = metadata['edmx:Edmx']['edmx:DataServices']['Schema']
					.find((x: any) => x['$']['Namespace'] === 'microsoft.graph')
					['EntityType'].filter((x: any) =>
						['entity', 'directoryObject', 'user'].includes(x['$']['Name']),
					);
				let properties = entities
					.flatMap((x: any) => x['Property'])
					.map((x: any) => x['$']['Name']) as string[];
				/* eslint-enable */

				// signInActivity requires AuditLog.Read.All
				// mailboxSettings MailboxSettings.Read
				properties = properties.filter(
					(x) =>
						!['id', 'deviceEnrollmentLimit', 'mailboxSettings', 'print', 'signInActivity'].includes(
							x,
						),
				);

				const operation = this.getCurrentNodeParameter('operation');
				if (operation === 'getAll') {
					// The following properties are only supported when retrieving a single user
					properties = properties.filter(
						(x) =>
							![
								'aboutMe',
								'birthday',
								'hireDate',
								'interests',
								'mySite',
								'pastProjects',
								'preferredName',
								'responsibilities',
								'schools',
								'skills',
								'mailboxSettings',
							].includes(x),
					);
				}

				properties = properties.sort();

				for (const property of properties) {
					returnData.push({
						name: property,
						value: property,
					});
				}
				return returnData;
			},
		},

		listSearch: {
			async getGroups(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				let response: any;
				if (paginationToken) {
					response = await microsoftApiRequest.call(
						this,
						'GET',
						'/groups',
						{},
						undefined,
						undefined,
						paginationToken,
					);
				} else {
					const qs: IDataObject = {
						$select: 'id,displayName',
					};
					const headers: IDataObject = {};
					if (filter) {
						headers.ConsistencyLevel = 'eventual';
						qs.$search = `"displayName:${filter}"`;
					}
					response = await microsoftApiRequest.call(this, 'GET', '/groups', {}, qs, headers);
				}

				const groups: Array<{
					id: string;
					displayName: string;
				}> = response.value;

				const results: INodeListSearchItems[] = groups
					.map((g) => ({
						name: g.displayName,
						value: g.id,
					}))
					.sort((a, b) =>
						a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
					);

				return { results, paginationToken: response['@odata.nextLink'] };
			},

			async getUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				let response: any;
				if (paginationToken) {
					response = await microsoftApiRequest.call(
						this,
						'GET',
						'/users',
						{},
						undefined,
						undefined,
						paginationToken,
					);
				} else {
					const qs: IDataObject = {
						$select: 'id,displayName',
					};
					const headers: IDataObject = {};
					if (filter) {
						qs.$filter = `startsWith(displayName, '${filter}') OR startsWith(userPrincipalName, '${filter}')`;
					}
					response = await microsoftApiRequest.call(this, 'GET', '/users', {}, qs, headers);
				}

				const users: Array<{
					id: string;
					displayName: string;
				}> = response.value;

				const results: INodeListSearchItems[] = users
					.map((u) => ({
						name: u.displayName,
						value: u.id,
					}))
					.sort((a, b) =>
						a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
					);

				return { results, paginationToken: response['@odata.nextLink'] };
			},
		},
	};
}
