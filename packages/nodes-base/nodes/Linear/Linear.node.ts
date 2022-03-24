import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import {
	linearApiRequest,
	linearApiRequestAllItems,
	sort,
	validateCrendetials,
} from './GenericFunctions';

import {
	issueFields,
	issueOperations,
} from './IssueDescription';

import {
	query,
} from './Queries';
interface IGraphqlBody {
	query: string;
	variables: IDataObject;
}
export class Linear implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Linear',
		name: 'linear',
		icon: 'file:linear.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Linear API',
		defaults: {
			name: 'Linear',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'linearApi',
				required: true,
				testedBy: 'linearApiTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Issue',
						value: 'issue',
					},
				],
				default: 'issue',
			},
			...issueOperations,
			...issueFields,
		],
	};

	methods = {
		credentialTest: {
			async linearApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				try {
					await validateCrendetials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					const { error: err } = error as JsonObject;
					const errors = (err as IDataObject).errors as [{ extensions: { code: string } }];
					const authenticationError = Boolean(errors.filter(e => e.extensions.code === 'AUTHENTICATION_ERROR').length);
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
						name: team.name,
						value: team.id,
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
						name: user.name,
						value: user.id,
					});
				}
				return returnData;
			},
			async getStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const body = {
					query: query.getStates(),
					variables: {
						$first: 10,
					},
				};
				const states = await linearApiRequestAllItems.call(this, 'data.workflowStates', body);

				for (const state of states) {
					returnData.push({
						name: state.name,
						value: state.id,
					});
				}
				return returnData.sort(sort);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'issue') {
					if (operation === 'create') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IGraphqlBody = {
							query: query.createIssue(),
							variables: {
								teamId,
								title,
								...additionalFields,
							},
						};

						responseData = await linearApiRequest.call(this, body);
						responseData = responseData.data.issueCreate?.issue;
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
						responseData = responseData?.data?.issueDelete;
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
						responseData = responseData.data?.issues?.nodes[0];
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const body: IGraphqlBody = {
							query: query.getIssues(),
							variables: {
								first: 50,
							},
						};
						if (returnAll) {
							responseData = await linearApiRequestAllItems.call(this, 'data.issues', body);
						} else {
							const limit = this.getNodeParameter('limit', 0) as number;
							body.variables.first = limit;
							responseData = await linearApiRequest.call(this, body);
							responseData = responseData.data.issues.nodes;
						}
					}
					if (operation === 'update') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IGraphqlBody = {
							query: query.updateIssue(),
							variables: {
								issueId,
								...updateFields,
							},
						};

						responseData = await linearApiRequest.call(this, body);
						responseData = responseData?.data?.issueUpdate?.issue;
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						error: (error as JsonObject).message,
					});
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
