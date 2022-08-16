import { IExecuteFunctions } from 'n8n-core';
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
	NodeApiError,
} from 'n8n-workflow';
import {
	validateCredentials,
	yepCodeApiRequest,
	yepCodeApiRequestAllItems,
	yepCodeWebhookRequest,
} from './GenericFunctions';
import { query } from './Queries';
import get from 'lodash.get';
import { IProcess } from './ProcessInterface';

export class YepCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'YepCode',
		name: 'yepCode',
		icon: 'file:yepcode.svg',
		group: ['output'],
		version: 1,
		description: 'Invoke YepCode processes',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["process"]}}',
		defaults: {
			name: 'YepCode',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'yepCodeApi',
				required: true,
				testedBy: 'yepCodeApiTest',
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
						name: 'Invoke',
						value: 'invoke',
						description: 'Invoke a process',
						action: 'Invoke a process',
					},
				],
				default: 'invoke',
			},
			{
				displayName: 'Team Name or ID',
				name: 'team',
				type: 'options',
				noDataExpression: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				default: '',
			},
			{
				displayName: 'Process Name or ID',
				name: 'process',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProcesses',
					loadOptionsDependsOn: ['team'],
				},
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				default: '',
				required: true,
				description:
					'Only processes with webhook are available. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Tag Name or ID',
				name: 'tag',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVersionedProcesses',
					loadOptionsDependsOn: ['process'],
				},
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				required: true,
				default: '$CURRENT',
				description:
					'Specify a version tag to invoke a published version of the process. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Invocation Type',
				name: 'invocationType',
				type: 'options',
				options: [
					{
						name: 'Wait for Results',
						value: 'sync',
						description: 'Invoke the process synchronously and wait for the response',
					},
					{
						name: 'Continue Workflow',
						value: 'async',
						description: 'Invoke the process and immediately continue the workflow',
					},
				],
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				default: 'sync',
				description: 'Specify if the workflow should wait for the function to return the results',
			},
			{
				displayName: 'JSON Input',
				name: 'payload',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['invoke'],
					},
				},
				default: '',
				description: 'The JSON that you want to provide to your YepCode process as input',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
	};

	methods = {
		credentialTest: {
			async yepCodeApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					await validateCredentials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					return {
						status: 'Error',
						message: 'The email or password included in the credential is invalid',
					};
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
				};
				const responseData = await yepCodeApiRequest.call(this, body);
				const teams = get(responseData, `data.teams`);
				for (const team of teams) {
					returnData.push({
						name: team.name,
						value: team.slug,
					});
				}
				return returnData;
			},
			async getProcesses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const teamId = this.getCurrentNodeParameter('team') as string;
				const body = {
					query: query.getProcesses(),
					variables: {
						$first: 10,
					},
				};

				const processes = await yepCodeApiRequestAllItems.call(
					this,
					teamId,
					'data.processes',
					body,
				);
				for (const process of processes) {
					if (process.triggers?.webhook?.enabled) {
						returnData.push({
							name: process.name,
							value: process.id,
						});
					}
				}
				return returnData;
			},
			async getVersionedProcesses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [
					{
						name: '$CURRENT',
						value: '$CURRENT',
					},
				];
				const teamId = this.getCurrentNodeParameter('team') as string;
				const processId = this.getCurrentNodeParameter('process') as string;
				const body = {
					query: query.getTags(),
					variables: {
						processId,
					},
				};
				const responseData = await yepCodeApiRequest.call(this, body, teamId);
				const versions = get(responseData, `data.allVersionedProcesses`);
				for (const version of versions) {
					returnData.push({
						name: version.tag,
						value: version.tag,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const teamId = this.getNodeParameter('team', i) as string;
				const processId = this.getNodeParameter('process', i) as string;
				const tag = this.getNodeParameter('tag', i) as string;
				const versionTag = tag === '$CURRENT' ? '' : tag;
				const invocationType = this.getNodeParameter('invocationType', i) as string;
				const async = invocationType === 'async';
				const payload = this.getNodeParameter('payload', i) as IDataObject;

				const body = {
					query: query.getProcess(),
					variables: {
						id: processId,
					},
				};
				const returnProcessData = await yepCodeApiRequest.call(this, body, teamId);
				const process = get(returnProcessData, `data.process`) as IProcess;
				const responseData = await yepCodeWebhookRequest.call(
					this,
					teamId,
					process,
					versionTag,
					async,
					payload,
				);
				if (responseData !== null && responseData?.errorMessage !== undefined) {
					throw new NodeApiError(this.getNode(), responseData);
				} else {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
