import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeCredentialTestResult,
} from 'n8n-workflow';

import {
	grafanaApiRequest,
	throwOnEmptyUpdate,
	tolerateTrailingSlash,
} from './GenericFunctions';

import {
	dashboardFields,
	dashboardOperations,
	teamFields,
	teamOperations,
	teamMemberFields,
	teamMemberOperations,
	userFields,
	userOperations,
} from './descriptions';

import {
	OptionsWithUri,
} from 'request';
import { DashboardUpdatePayload, GrafanaCredentials } from './types';

export class Grafana implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grafana',
		name: 'grafana',
		icon: 'file:grafana.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Grafana API',
		defaults: {
			name: 'Grafana',
			color: '#fb755a',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'grafanaApi',
				required: true,
				testedBy: 'grafanaApiTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				noDataExpression: true,
				type: 'options',
				options: [
					{
						name: 'Dashboard',
						value: 'dashboard',
					},
					{
						name: 'Team',
						value: 'team',
					},
					{
						name: 'Team Member',
						value: 'teamMember',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'dashboard',
			},
			...dashboardOperations,
			...dashboardFields,
			...teamOperations,
			...teamFields,
			...teamMemberOperations,
			...teamMemberFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			async getDashboards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const dashboards = await grafanaApiRequest.call(this, 'GET', '/search', {}, { qs: 'dash-db' }) as Array<{ id: number; title: string }>;
				return dashboards.map(({ id, title }) => ({ value: id, name: title }));
			},

			async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const folders = await grafanaApiRequest.call(this, 'GET', '/folders') as Array<{ id: number; title: string }>;
				return folders.map(({ id, title }) => ({ value: id, name: title }));
			},

			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const res = await grafanaApiRequest.call(this, 'GET', '/teams/search') as { teams: Array<{ id: number; name: string }> };
				return res.teams.map(({ id, name }) => ({ value: id, name }));
			},

			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const users = await grafanaApiRequest.call(this, 'GET', '/org/users') as Array<{ userId: number; email: string }>;
				return users.map(({ userId, email }) => ({ value: userId, name: email }));
			},
		},

		credentialTest: {
			async grafanaApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted
			): Promise<NodeCredentialTestResult> {
				const { apiKey, baseUrl: rawBaseUrl } = credential.data as GrafanaCredentials;
				const baseUrl = tolerateTrailingSlash(rawBaseUrl);

				const options: OptionsWithUri = {
					headers: {
						Authorization: `Bearer ${apiKey}`,
					},
					method: 'GET',
					uri: `${baseUrl}/api/folders`,
					json: true,
				};

				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
			},
		},
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'dashboard') {

					// **********************************************************************
					//                               dashboard
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//            dashboard: create
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/dashboard/#create--update-dashboard

						const body = {
							dashboard: {
								id: null,
								title: this.getNodeParameter('title', i),
							},
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await grafanaApiRequest.call(this, 'POST', '/dashboards/db', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//            dashboard: delete
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/dashboard/#delete-dashboard-by-uid

						const dashboardId = this.getNodeParameter('dashboardUid', i);
						const endpoint = `/dashboards/uid/${dashboardId}`;
						responseData = await grafanaApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//              dashboard: get
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/dashboard/#get-dashboard-by-uid

						const dashboardUid = this.getNodeParameter('dashboardUid', i);
						const endpoint = `/dashboards/uid/${dashboardUid}`;
						responseData = await grafanaApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//            dashboard: getAll
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/folder_dashboard_search/#search-folders-and-dashboards

						const qs = {
							type: 'dash-db',
						};

						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							Object.assign(qs, { limit });
						}

						responseData = await grafanaApiRequest.call(this, 'GET', '/search', {}, qs);

					} else if (operation === 'update') {

						// ----------------------------------------
						//            dashboard: update
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/dashboard/#create--update-dashboard

						const dashboardUid = this.getNodeParameter('dashboardUid', i) as string;

						const body: DashboardUpdatePayload = {
							overwrite: true,
							dashboard: {
								uid: dashboardUid,
							},
						};

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						throwOnEmptyUpdate.call(this, resource, updateFields);

						const { title, ...rest } = updateFields;

						body.dashboard.title = title !== undefined
							? title
							: await grafanaApiRequest.call(this, 'GET', `/dashboards/uid/${dashboardUid}`);

						if (Object.keys(rest).length) {
							Object.assign(body, rest);
						}

						responseData = await grafanaApiRequest.call(this, 'POST', '/dashboards/db', body);

					}

				} else if (resource === 'team') {

					// **********************************************************************
					//                                  team
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//               team: create
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#add-team

						const body = {
							name: this.getNodeParameter('name', i) as string,
						}

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields)
						}

						responseData = await grafanaApiRequest.call(this, 'POST', '/teams', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//               team: delete
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#delete-team-by-id

						const teamId = this.getNodeParameter('teamId', i);
						responseData = await grafanaApiRequest.call(this, 'DELETE', `/teams/${teamId}`);

					} else if (operation === 'get') {

						// ----------------------------------------
						//                team: get
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#get-team-by-id

						const teamId = this.getNodeParameter('teamId', i);
						responseData = await grafanaApiRequest.call(this, 'GET', `/teams/${teamId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//               team: getAll
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#team-search-with-paging

						const qs = {} as IDataObject;

						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await grafanaApiRequest.call(this, 'GET', '/teams/search', {}, qs);
						responseData = responseData.teams;

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.slice(0, limit);
						}

					} else if (operation === 'update') {

						// ----------------------------------------
						//               team: update
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#update-team

						const body = {
							overwrite: true,
						};

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						throwOnEmptyUpdate.call(this, resource, updateFields);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						const teamId = this.getNodeParameter('teamId', i);

						await grafanaApiRequest.call(this, 'PUT', `/teams/${teamId}`, body);
						responseData = await grafanaApiRequest.call(this, 'GET', `/teams/${teamId}`);

					}

				} else if (resource === 'teamMember') {

					// **********************************************************************
					//                               teamMember
					// **********************************************************************

					if (operation === 'add') {

						// ----------------------------------------
						//            teamMember: add
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#add-team-member

						const userId = this.getNodeParameter('userId', i) as string;

						const body = {
							userId: parseInt(userId, 10),
						}

						const teamId = this.getNodeParameter('teamId', i);
						const endpoint = `/teams/${teamId}/members`;
						responseData = await grafanaApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'remove') {

						// ----------------------------------------
						//            teamMember: remove
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#remove-member-from-team

						const teamId = this.getNodeParameter('teamId', i);
						const memberId = this.getNodeParameter('memberId', i);
						const endpoint = `/teams/${teamId}/members/${memberId}`;
						responseData = await grafanaApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//            teamMember: getAll
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/team/#get-team-members

						const teamId = this.getNodeParameter('teamId', i);
						const endpoint = `/teams/${teamId}/members`;
						responseData = await grafanaApiRequest.call(this, 'GET', endpoint);

					}

				} else if (resource === 'user') {

					// **********************************************************************
					//                                  user
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//                user: create
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/org/#add-a-new-user-to-the-current-organization

						const body = {
							role: this.getNodeParameter('role', i),
							loginOrEmail: this.getNodeParameter('loginOrEmail', i),
						};

						responseData = await grafanaApiRequest.call(this, 'POST', '/org/users', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//                user: delete
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/org/#delete-user-in-current-organization

						const userId = this.getNodeParameter('userId', i);
						responseData = await grafanaApiRequest.call(this, 'DELETE', `/org/users/${userId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//               user: getAll
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/org/#get-all-users-within-the-current-organization

						responseData = await grafanaApiRequest.call(this, 'GET', '/org/users');

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.slice(0, limit);
						}

					} else if (operation === 'update') {

						// ----------------------------------------
						//               user: update
						// ----------------------------------------

						// https://grafana.com/docs/grafana/latest/http_api/org/#updates-the-given-user

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						throwOnEmptyUpdate.call(this, resource, updateFields);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						const userId = this.getNodeParameter('userId', i) as string;
						responseData = await grafanaApiRequest.call(this, 'PATCH', `/org/users/${userId}`, body);

					}

				}

				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}