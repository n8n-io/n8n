import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeCredentialTestResult,
} from 'n8n-workflow';

import {
	jenkinsApiRequest,
} from './GenericFunctions';

import {
	parseString,
} from 'xml2js';


export type JenkinsApiCredentials = {
	username: string;
	apiKey: string;
	baseUrl: string;
};

export class Jenkins implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jenkins',
		name: 'Jenkins',
		icon: 'file:jenkins.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Jenkins API',
		defaults: {
			name: 'Jenkins',
			color: '#04AA51',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jenkinsApi',
				required: true,
				testedBy: 'buildsGetApiTest',
			},
		],
		properties: [
			{
				displayName: 'Jenkins URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				description: 'Location of Jenkins installation',
				noDataExpression: true,
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Jenkins Instance',
						value: 'jenkins',
						description: 'Jenkins instance',
					},
					{
						name: 'Job',
						value: 'job',
						description: 'Jenkins job',
					},
					{
						name: 'Builds',
						value: 'builds',
						description: 'List of builds job',
					},
				],
				default: 'job',
				description: 'The resource to operate on',
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
						resource: [
							'job',
						],
					},
				},
				options: [
					{
						name: 'Trigger a Job',
						value: 'trigger',
						description: 'Trigger a specific job',
					},
					{
						name: 'Trigger a with Parameters',
						value: 'triggerParams',
						description: 'Trigger a specific job',
					},
					{
						name: 'Copy a Job',
						value: 'copy',
						description: 'Copy a specific job',
					},
					{
						name: 'Create a Job',
						value: 'create',
						description: 'Create a new job',
					},
				],
				default: 'trigger',
				description: 'Possible operations',
				noDataExpression: true,
			},
			{
				displayName: 'Job Name',
				name: 'job',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'job',
						],
						operation: [
							'trigger',
							'triggerParams',
							'copy',
						],
					},
				},
				required: true,
				default: '',
				description: 'Job token',
			},
			// --------------------------------------------------------------------------------------------------------
			//         Trigger a Job
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Job Token',
				name: 'token',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'job',
						],
						operation: [
							'trigger',
							'triggerParams',
						],
					},
				},
				required: true,
				default: '',
				description: 'Name of the jenkins job',
			},
			{
				displayName: 'Parameters',
				name: 'param',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						resource: [
							'job',
						],
						operation: [
							'triggerParams',
						],
					},
				},
				required: true,
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'params',
						displayName: 'Parameters',
						values: [
							{
								displayName: 'Parameter',
								name: 'name',
								type: 'string',
								default: 'Name of the Parameter  to add.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the parameter',
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
						resource: [
							'job',
						],
						operation: [
							'copy',
							'create',
						],
					},
				},
				required: true,
				default: '',
				description: 'Name of the new jenkins job',
			},
			{
				displayName: 'XML',
				name: 'xml',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'job',
						],
						operation: [
							'create',
						],
					},
				},
				required: true,
				default: '',
				description: 'XML of Jenkins config',
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
						resource: [
							'jenkins',
						],
					},
				},
				options: [
					{
						name: 'Cancel Quiet Down Jenkins',
						value: 'cancelQuietDown',
						description: 'Cancel quiet down state',
					},
					{
						name: 'Quiet Down Jenkins',
						value: 'quietDown',
						description: 'Puts Jenkins in quiet mode, no builds can be started, Jenkins is ready for shutdown',
					},
					{
						name: 'Restart Jenkins',
						value: 'restart',
						description: 'Restart Jenkins immediately on environments where it is possible',
					},
					{
						name: 'Safely Restart Jenkins',
						value: 'safeRestart',
						description: 'Restart Jenkins once no jobs are running on environments where it is possible',
					},
					{
						name: 'Safely Shutdown Jenkins',
						value: 'safeExit',
						description: 'Shutdown once no jobs are running',
					},
					{
						name: 'Shutdown Jenkins',
						value: 'exit',
						description: 'Shutdown Jenkins immediately',
					},
				],
				default: 'safeRestart',
				description: 'Jenkins operation',
				noDataExpression: true,
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'jenkins',
						],
						operation: [
							'quietDown',
						],
					},
				},
				required: false,
				default: '',
				description: 'Freeform reason for quiet down mode',
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
						resource: [
							'builds',
						],
					},
				},
				options: [
					{
						name: 'List Builds',
						value: 'list',
						description: 'List Builds',
					},
				],
				default: 'list',
				description: 'Build operation',
				noDataExpression: true,
			},
			{
				displayName: 'Depth',
				name: 'depth',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'builds',
						],
						operation: [
							'list',
						],
					},
				},
				required: true,
				default: 1,
				description: 'String depth parameter',
			},
			{
				displayName: 'Tree',
				name: 'tree',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'builds',
						],
						operation: [
							'list',
						],
					},
				},
				required: false,
				default: '',
				description: 'String tree parameter',
			},
			{
				displayName: 'Xpath',
				name: 'xpath',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'builds',
						],
						operation: [
							'list',
						],
					},
				},
				required: false,
				default: '',
				description: 'String xpath parameter',
			},
			{
				displayName: 'Exclude',
				name: 'exclude',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'builds',
						],
						operation: [
							'list',
						],
					},
				},
				required: false,
				default: '',
				description: 'String exclude parameter',
			},
		],
	};

	methods = {
		credentialTest: {
			async buildsGetApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<NodeCredentialTestResult> {
				const { baseUrl, username, apiKey } = credential.data as JenkinsApiCredentials;
				const token = Buffer.from(`${username}:${apiKey}`).toString('base64');

				const endpoint = '/api/xml';

				const options = {
					headers: {
						Authorization: `Basic ${token}`,
					},
					method: 'GET',
					body: {},
					qs: {},
					uri: `${baseUrl}${endpoint}`,
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
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				const baseUrl = this.getNodeParameter('url', i) as string;
				if (resource === 'job') {
					if (operation === 'trigger') {
						const token = this.getNodeParameter('token', i) as string;
						const job = this.getNodeParameter('job', i) as string;
						const endpoint = `${baseUrl}/job/${job}/build?token=${token}`;
						responseData = await jenkinsApiRequest.call(this, 'get', endpoint);
					}
					if (operation === 'triggerParams') {
						const token = this.getNodeParameter('token', i) as string;
						const job = this.getNodeParameter('job', i) as string;
						const params = this.getNodeParameter('param.params', i , [] ) as [];
						let body = {};
						if (params.length) {
							body = params.reduce((body:IDataObject , param: {name: string; value: string}) => {
								body[param.name] = param.value;
								return body;
							}, {});
						}
						console.log(body);
						const endpoint = `${baseUrl}/job/${job}/buildWithParameters?token=${token}`;
						responseData = await jenkinsApiRequest.call(this, 'get', endpoint, {}, {}, { data: body });
					}
					if (operation === 'copy') {
						const job = this.getNodeParameter('job', i) as string;
						const name = this.getNodeParameter('newJob', i) as string;
						const queryParams = {
							name,
							mode: 'copy',
							from: job,
						};

						const endpoint = `${baseUrl}/createItem`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint, queryParams);
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


						const endpoint = `${baseUrl}/createItem`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint, queryParams, headers, body);
					}
				}
				if (resource === 'jenkins') {

					if (operation === 'quietDown') {
						const reason = this.getNodeParameter('reason', i) as string;
						let queryParams;
						if (reason) {
							queryParams = {
								reason,
							};
						}

						const endpoint = `${baseUrl}/quietDown`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint, queryParams);
					}
					if (operation === 'cancelQuietDown') {
						const endpoint = `${baseUrl}/cancelQuietDown`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint);
					}
					if (operation === 'restart') {
						const endpoint = `${baseUrl}/restart`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint);
					}
					if (operation === 'safeRestart') {
						const endpoint = `${baseUrl}/safeRestart`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint);
					}
					if (operation === 'exit') {
						const endpoint = `${baseUrl}/exit`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint);
					}
					if (operation === 'safeExit') {
						const endpoint = `${baseUrl}/safeExit`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint);
					}
				}
				if (resource === 'builds') {
					if (operation === 'list') {
						const endpoint = `${baseUrl}/api/xml`;
						const depth = this.getNodeParameter('depth', i) as number;
						const tree = this.getNodeParameter('tree', i) as string ;
						const xpath = this.getNodeParameter('xpath', i) as string;
						const exclude = this.getNodeParameter('exclude', i) as string;

						const queryParams = {
							depth,
							tree: tree.length? tree : undefined,
							xpath: xpath.length? xpath : undefined,
							exclude: exclude.length? exclude : undefined,
						};

						const response = await jenkinsApiRequest.call(this, 'get', endpoint, queryParams);
						responseData = await new Promise((resolve, reject) => {
							parseString(response, { explicitArray: false }, (err, data) => {
								if (err) {
									return reject(err);
								}
								resolve(data);
							});
						});
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
