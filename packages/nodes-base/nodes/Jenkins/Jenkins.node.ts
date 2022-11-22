import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import { jenkinsApiRequest, tolerateTrailingSlash } from './GenericFunctions';

export type JenkinsApiCredentials = {
	username: string;
	apiKey: string;
	baseUrl: string;
};

export class Jenkins implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jenkins',
		name: 'jenkins',
		icon: 'file:jenkins.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Jenkins API',
		defaults: {
			name: 'Jenkins',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jenkinsApi',
				required: true,
				testedBy: 'jenkinApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Build',
						value: 'build',
					},
					{
						name: 'Instance',
						value: 'instance',
					},
					{
						name: 'Job',
						value: 'job',
					},
				],
				default: 'job',
				noDataExpression: true,
			},

			// --------------------------------------------------------------------------------------------------------
			//         Job Operations
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['job'],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a specific job',
						action: 'Copy a job',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new job',
						action: 'Create a job',
					},
					{
						name: 'Trigger',
						value: 'trigger',
						description: 'Trigger a specific job',
						action: 'Trigger a job',
					},
					{
						name: 'Trigger with Parameters',
						value: 'triggerParams',
						description: 'Trigger a specific job',
						action: 'Trigger a job with parameters',
					},
				],
				default: 'trigger',
				description: 'Possible operations',
				noDataExpression: true,
			},
			{
				displayName:
					'Make sure the job is setup to support triggering with parameters. <a href="https://wiki.jenkins.io/display/JENKINS/Parameterized+Build" target="_blank">More info</a>',
				name: 'triggerParamsNotice',
				type: 'notice',
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['triggerParams'],
					},
				},
				default: '',
			},
			{
				displayName: 'Job Name or ID',
				name: 'job',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getJobs',
				},
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['trigger', 'triggerParams', 'copy'],
					},
				},
				required: true,
				default: '',
				description:
					'Name of the job. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},

			// --------------------------------------------------------------------------------------------------------
			//         Trigger a Job
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Parameters',
				name: 'param',
				type: 'fixedCollection',
				placeholder: 'Add Parameter',
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['triggerParams'],
					},
				},
				required: true,
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'params',
						displayName: 'Parameters',
						values: [
							{
								displayName: 'Name or ID',
								name: 'name',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getJobParameters',
									loadOptionsDependsOn: ['job'],
								},
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
				description: 'Parameters for Jenkins job',
			},

			// --------------------------------------------------------------------------------------------------------
			//         Copy or Create a Job
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'New Job Name',
				name: 'newJob',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['copy', 'create'],
					},
				},
				required: true,
				default: '',
				description: 'Name of the new Jenkins job',
			},
			{
				displayName: 'XML',
				name: 'xml',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['create'],
					},
				},
				required: true,
				default: '',
				description: 'XML of Jenkins config',
			},
			{
				displayName:
					'To get the XML of an existing job, add ‘config.xml’ to the end of the job URL',
				name: 'createNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['create'],
					},
				},
			},

			// --------------------------------------------------------------------------------------------------------
			//         Jenkins operations
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['instance'],
					},
				},
				options: [
					{
						name: 'Cancel Quiet Down',
						value: 'cancelQuietDown',
						description: 'Cancel quiet down state',
						action: 'Cancel Quiet Down an instance',
					},
					{
						name: 'Quiet Down',
						value: 'quietDown',
						description:
							'Put Jenkins in quiet mode, no builds can be started, Jenkins is ready for shutdown',
						action: 'Quiet Down an instance',
					},
					{
						name: 'Restart',
						value: 'restart',
						description: 'Restart Jenkins immediately on environments where it is possible',
						action: 'Restart an instance',
					},
					{
						name: 'Safely Restart',
						value: 'safeRestart',
						description:
							'Restart Jenkins once no jobs are running on environments where it is possible',
						action: 'Safely Restart an instance',
					},
					{
						name: 'Safely Shutdown',
						value: 'safeExit',
						description: 'Shutdown once no jobs are running',
						action: 'Safely Shutdown an instance',
					},
					{
						name: 'Shutdown',
						value: 'exit',
						description: 'Shutdown Jenkins immediately',
						action: 'Shutdown an instance',
					},
				],
				default: 'safeRestart',
				description: 'Jenkins instance operations',
				noDataExpression: true,
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['instance'],
						operation: ['quietDown'],
					},
				},
				default: '',
				description: 'Freeform reason for quiet down mode',
			},
			{
				displayName:
					'Instance operation can shutdown Jenkins instance and make it unresponsive. Some commands may not be available depending on instance implementation.',
				name: 'instanceNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['instance'],
					},
				},
			},

			// --------------------------------------------------------------------------------------------------------
			//         Builds operations
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['build'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List Builds',
						action: 'Get many builds',
					},
				],
				default: 'getAll',
				noDataExpression: true,
			},
			{
				displayName: 'Job Name or ID',
				name: 'job',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getJobs',
				},
				displayOptions: {
					show: {
						resource: ['build'],
						operation: ['getAll'],
					},
				},
				required: true,
				default: '',
				description:
					'Name of the job. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['build'],
						operation: ['getAll'],
					},
				},
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['build'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				description: 'Max number of results to return',
			},
		],
	};

	methods = {
		credentialTest: {
			async jenkinApiCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const { baseUrl, username, apiKey } = credential.data as JenkinsApiCredentials;

				const url = tolerateTrailingSlash(baseUrl);
				const endpoint = '/api/json';

				const options = {
					auth: {
						username,
						password: apiKey,
					},
					method: 'GET',
					body: {},
					qs: {},
					uri: `${url}${endpoint}`,
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
		loadOptions: {
			async getJobs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = `/api/json`;
				const { jobs } = await jenkinsApiRequest.call(this, 'GET', endpoint);
				for (const job of jobs) {
					returnData.push({
						name: job.name,
						value: job.name,
					});
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
			async getJobParameters(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const job = this.getCurrentNodeParameter('job') as string;
				const returnData: INodePropertyOptions[] = [];
				const endpoint = `/job/${job}/api/json?tree=actions[parameterDefinitions[*]]`;
				const { actions } = await jenkinsApiRequest.call(this, 'GET', endpoint);
				for (const { _class, parameterDefinitions } of actions) {
					if (_class?.includes('ParametersDefinitionProperty')) {
						for (const { name, type } of parameterDefinitions) {
							returnData.push({
								name: `${name} - (${type})`,
								value: name,
							});
						}
					}
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'job') {
					if (operation === 'trigger') {
						const job = this.getNodeParameter('job', i) as string;
						const endpoint = `/job/${job}/build`;
						await jenkinsApiRequest.call(this, 'POST', endpoint);
						responseData = { success: true };
					}
					if (operation === 'triggerParams') {
						const job = this.getNodeParameter('job', i) as string;
						const params = this.getNodeParameter('param.params', i, []) as [];
						let body = {};
						if (params.length) {
							body = params.reduce((body: IDataObject, param: { name: string; value: string }) => {
								body[param.name] = param.value;
								return body;
							}, {});
						}
						const endpoint = `/job/${job}/buildWithParameters`;
						await jenkinsApiRequest.call(
							this,
							'POST',
							endpoint,
							{},
							{},
							{
								form: body,
								headers: {
									'content-type': 'application/x-www-form-urlencoded',
								},
							},
						);
						responseData = { success: true };
					}
					if (operation === 'copy') {
						const job = this.getNodeParameter('job', i) as string;
						const name = this.getNodeParameter('newJob', i) as string;
						const queryParams = {
							name,
							mode: 'copy',
							from: job,
						};

						const endpoint = `/createItem`;
						try {
							await jenkinsApiRequest.call(this, 'POST', endpoint, queryParams);
							responseData = { success: true };
						} catch (error) {
							if (error.httpCode === '302') {
								responseData = { success: true };
							} else {
								throw new NodeApiError(this.getNode(), error);
							}
						}
					}
					if (operation === 'create') {
						const name = this.getNodeParameter('newJob', i) as string;
						const queryParams = {
							name,
						};
						const headers = {
							'content-type': 'application/xml',
						};

						const body = this.getNodeParameter('xml', i) as string;

						const endpoint = `/createItem`;
						await jenkinsApiRequest.call(this, 'POST', endpoint, queryParams, body, {
							headers,
							json: false,
						});
						responseData = { success: true };
					}
				}

				if (resource === 'instance') {
					if (operation === 'quietDown') {
						const reason = this.getNodeParameter('reason', i) as string;

						let queryParams;
						if (reason) {
							queryParams = {
								reason,
							};
						}

						const endpoint = `/quietDown`;
						await jenkinsApiRequest.call(this, 'POST', endpoint, queryParams);
						responseData = { success: true };
					}
					if (operation === 'cancelQuietDown') {
						const endpoint = `/cancelQuietDown`;
						await jenkinsApiRequest.call(this, 'POST', endpoint);
						responseData = { success: true };
					}
					if (operation === 'restart') {
						const endpoint = `/restart`;
						try {
							await jenkinsApiRequest.call(this, 'POST', endpoint);
						} catch (error) {
							if (error.httpCode === '503') {
								responseData = { success: true };
							} else {
								throw new NodeApiError(this.getNode(), error);
							}
						}
					}
					if (operation === 'safeRestart') {
						const endpoint = `/safeRestart`;
						try {
							await jenkinsApiRequest.call(this, 'POST', endpoint);
						} catch (error) {
							if (error.httpCode === '503') {
								responseData = { success: true };
							} else {
								throw new NodeApiError(this.getNode(), error);
							}
						}
					}
					if (operation === 'exit') {
						const endpoint = `/exit`;
						await jenkinsApiRequest.call(this, 'POST', endpoint);
						responseData = { success: true };
					}
					if (operation === 'safeExit') {
						const endpoint = `/safeExit`;
						await jenkinsApiRequest.call(this, 'POST', endpoint);
						responseData = { success: true };
					}
				}

				if (resource === 'build') {
					if (operation === 'getAll') {
						const job = this.getNodeParameter('job', i) as string;
						let endpoint = `/job/${job}/api/json?tree=builds[*]`;
						const returnAll = this.getNodeParameter('returnAll', i);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							endpoint += `{0,${limit}}`;
						}

						responseData = await jenkinsApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.builds;
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
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
