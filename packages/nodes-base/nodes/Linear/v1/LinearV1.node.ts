import {
	type IExecuteFunctions,
	type ICredentialDataDecryptedObject,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type JsonObject,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { commentFields, commentOperations } from './CommentDescription';
import { issueFields, issueOperations } from './IssueDescription';
import { query } from './Queries';
import {
	linearApiRequest,
	linearApiRequestAllItems,
	sort,
	validateCredentials,
} from '../shared/GenericFunctions';

interface IGraphqlBody extends IDataObject {
	query: string;
	variables: IDataObject;
}

export class LinearV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Linear',
			name: 'linear',
			icon: 'file:linear.svg',
			group: ['output'],
			version: [1, 1.1],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Linear API',
			defaults: {
				name: 'Linear',
			},
			usableAsTool: true,
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'linearApi',
					required: true,
					testedBy: 'linearApiTest',
					displayOptions: {
						show: {
							authentication: ['apiToken'],
						},
					},
				},
				{
					name: 'linearOAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth2'],
						},
					},
				},
			],
			properties: [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [
						{
							name: 'API Token',
							value: 'apiToken',
						},
						{
							name: 'OAuth2',
							value: 'oAuth2',
						},
					],
					default: 'apiToken',
				},
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Comment',
							value: 'comment',
						},
						{
							name: 'Issue',
							value: 'issue',
						},
					],
					default: 'issue',
				},
				...commentOperations,
				...commentFields,
				...issueOperations,
				...issueFields,
			],
		};
	}

	methods = {
		credentialTest: {
			async linearApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					await validateCredentials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					const { error: err } = error as JsonObject;
					const errors = (err as IDataObject).errors as [{ extensions: { code: string } }];
					const authenticationError = Boolean(
						errors.filter((e) => e.extensions.code === 'AUTHENTICATION_ERROR').length,
					);
					if (authenticationError) {
						return {
							status: 'Error',
							message: 'The security token included in the request is invalid',
						};
					}
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
		loadOptions: {
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const body = {
					query: query.getTeams(),
					variables: {
						$first: 10,
					},
				};
				const teams = await linearApiRequestAllItems.call(this, 'data.teams', body);

				for (const team of teams) {
					returnData.push({
						name: team.name as string,
						value: team.id as string,
					});
				}
				return returnData;
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const body = {
					query: query.getUsers(),
					variables: {
						$first: 10,
					},
				};
				const users = await linearApiRequestAllItems.call(this, 'data.users', body);

				for (const user of users) {
					returnData.push({
						name: user.name as string,
						value: user.id as string,
					});
				}
				return returnData;
			},
			async getStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let teamId = this.getNodeParameter('teamId', null) as string;
				// Handle Updates
				if (!teamId) {
					const updateFields = this.getNodeParameter('updateFields', null) as IDataObject;
					// If not updating the team look up the current team
					if (!updateFields.teamId) {
						const issueId = this.getNodeParameter('issueId');
						const body = {
							query: query.getIssueTeam(),
							variables: {
								issueId,
							},
						};
						const responseData = await linearApiRequest.call(this, body);
						teamId = (responseData as IDataObject & { data: { issue: { team: { id: string } } } })
							?.data?.issue?.team?.id;
					} else {
						teamId = updateFields.teamId as string;
					}
				}

				const returnData: INodePropertyOptions[] = [];
				const body = {
					query: query.getStates(),
					variables: {
						$first: 10,
						filter: {
							team: {
								id: {
									eq: teamId,
								},
							},
						},
					},
				};
				const states = await linearApiRequestAllItems.call(this, 'data.workflowStates', body);

				for (const state of states) {
					returnData.push({
						name: state.name as string,
						value: state.id as string,
					});
				}
				return returnData.sort(sort);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'issue') {
					if (operation === 'create') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IGraphqlBody = {
							query: query.createIssue(),
							variables: {
								teamId,
								title,
								...(additionalFields as IDataObject),
							},
						};

						responseData = await linearApiRequest.call(this, body);
						responseData = (
							responseData as IDataObject & {
								data: { issueCreate: { issue: IDataObject } };
							}
						).data.issueCreate?.issue;
					}
					if (operation === 'delete') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const body: IGraphqlBody = {
							query: query.deleteIssue(),
							variables: {
								issueId,
							},
						};

						responseData = await linearApiRequest.call(this, body);
						responseData = (
							responseData as IDataObject & {
								data: { issueDelete: IDataObject };
							}
						)?.data?.issueDelete;
					}
					if (operation === 'get') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const body: IGraphqlBody = {
							query: query.getIssue(),
							variables: {
								issueId,
							},
						};

						responseData = await linearApiRequest.call(this, body);
						responseData = (responseData as IDataObject & { data: { issue: IDataObject } }).data
							.issue;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const body: IGraphqlBody = {
							query: query.getIssues(),
							variables: {
								first: 50,
							},
						};
						if (returnAll) {
							responseData = await linearApiRequestAllItems.call(this, 'data.issues', body);
						} else {
							const limit = this.getNodeParameter('limit', 0);
							responseData = await linearApiRequestAllItems.call(
								this,
								'data.issues',
								body,
								limit as number,
							);
						}
					}
					if (operation === 'update') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IGraphqlBody = {
							query: query.updateIssue(),
							variables: {
								issueId,
								...(updateFields as IDataObject),
							},
						};

						responseData = await linearApiRequest.call(this, body);
						responseData = (
							responseData as IDataObject & {
								data: { issueUpdate: { issue: IDataObject } };
							}
						)?.data?.issueUpdate?.issue;
					}
					if (operation === 'addLink') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const body: IGraphqlBody = {
							query: query.addIssueLink(),
							variables: {
								issueId,
								url: this.getNodeParameter('link', i),
							},
						};

						responseData = await linearApiRequest.call(this, body);
						responseData = (
							responseData as IDataObject & {
								data: { attachmentLinkURL: IDataObject };
							}
						)?.data?.attachmentLinkURL;
					}
				} else if (resource === 'comment') {
					if (operation === 'addComment') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const body = this.getNodeParameter('comment', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const requestBody: IGraphqlBody = {
							query: query.addComment(),
							variables: {
								issueId,
								body,
							},
						};

						if (
							(additionalFields as IDataObject).parentId &&
							((additionalFields as IDataObject).parentId as string).trim() !== ''
						) {
							requestBody.variables.parentId = (additionalFields as IDataObject).parentId as string;
						}

						responseData = await linearApiRequest.call(this, requestBody);
						responseData = (
							responseData as IDataObject & {
								data: { commentCreate: IDataObject };
							}
						)?.data?.commentCreate;
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
