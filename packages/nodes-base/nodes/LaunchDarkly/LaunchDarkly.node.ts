import {
	IExecuteFunctions,
} from 'n8n-core';

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
} from 'n8n-workflow';

import { launchDarklyApiRequest } from './GenericFunctions';
import { segmentsFields, segmentsOperations } from './SegmentsDescription';
import { userSettingsFields, userSettingsOperations } from './UserSettingsDescription';

export class LaunchDarkly implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Launch Darkly',
		name: 'launchDarkly',
		icon: 'file:launchdarkly.svg',
		group: ['input'],
		version: 1,
		description: 'Launch Darkly API',
		defaults: {
			name: 'Launch Darkly',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'launchDarklyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
				testedBy: 'testLaunchDarklyTokenAuth',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
				],
				default: 'accessToken',
				description: 'Authentication Type',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'User Setting',
						value: 'userSettings',
					},
					{
						name: 'Segment',
						value: 'segments',
					},
				],
				default: '',
			},
			...userSettingsOperations,
			...userSettingsFields,
			...segmentsOperations,
			...segmentsFields,
		],
	};


	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const result = await launchDarklyApiRequest.call(this, 'GET', '/projects');
				return result.items.map((item: IDataObject) => ({
					name: item.name,
					value: item.key,
				}));
			},
			async getEnvironments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectKey = this.getCurrentNodeParameter('projectKey');
				if (!projectKey) {
					return [];
				}

				const result = await launchDarklyApiRequest.call(this, 'GET', `/projects/${projectKey}/environments`);
				return result.items.map((item: IDataObject) => ({
					name: item.name,
					value: item.key,
				}));
			},
			async getFeatureFlags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectKey = this.getCurrentNodeParameter('projectKey');
				if (!projectKey) {
					return [];
				}

				const result = await launchDarklyApiRequest.call(this, 'GET', `/flags/${projectKey}`);
				return result.items.map((item: IDataObject) => ({
					name: item.name,
					value: item.key,
				}));
			},
			async getVariationsByFlag(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const featureFlagKey = this.getCurrentNodeParameter('featureFlagKey');
				if (!featureFlagKey) {
					return [];
				}

				const projectKey = this.getCurrentNodeParameter('projectKey');
				const featureFlagObj = await launchDarklyApiRequest.call(this, 'GET', `/flags/${projectKey}/${featureFlagKey}`);
				return featureFlagObj.variations.map((variation: IDataObject) => ({
					name: variation.value,
					value: variation.value,
				}));
			},
			async getSegments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectKey = this.getCurrentNodeParameter('projectKey');
				const environmentKey = this.getCurrentNodeParameter('environmentKey');
				if (!projectKey || !environmentKey) {
					return [];
				}

				const segments = await launchDarklyApiRequest.call(this, 'GET', `/segments/${projectKey}/${environmentKey}`);
				return segments.items.map((segment: IDataObject) => ({
					name: segment.name,
					value: segment.key,
				}));
			},
		},
		credentialTest: {
			async testLaunchDarklyTokenAuth(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				const options = {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
						Authorization: credential.data!.accessToken,
					},
					uri: 'https://app.launchdarkly.com/api/v2/projects',
					json: true,
				};

				try {
					await this.helpers.request(options);
				} catch (err) {
					return {
						status: 'Error',
						message: `${err.message}`,
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
		const returnData: IDataObject[] = [];
		const length = items.length;

		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'userSettings') {
					if (operation === 'updateFlagSettingsForUser') {
						const projectKey = this.getNodeParameter('projectKey', i) as string;
						const environmentKey = this.getNodeParameter('environmentKey', i) as string;
						const userKey = this.getNodeParameter('userKey', i) as string;
						const featureFlagKey = this.getNodeParameter('featureFlagKey', i) as string;

						const setting = this.getNodeParameter('setting', i);
						const comment = this.getNodeParameter('comment', i) as string;

						const body: IDataObject = {
							setting,
							comment,
						};

						await launchDarklyApiRequest.call(this, 'PUT', `/users/${projectKey}/${environmentKey}/${userKey}/flags/${featureFlagKey}`, body);
						responseData = {
							success: true,
							projectKey,
							environmentKey,
							userKey,
							featureFlagKey,
							setting,
							comment,
						};
					}
				} else if (resource === 'segments') {
					if (operation === 'patchSegment') {
						const projectKey = this.getNodeParameter('projectKey', i) as string;
						const environmentKey = this.getNodeParameter('environmentKey', i) as string;
						const segmentKey = this.getNodeParameter('segmentKey', i) as string;
						const kind = this.getNodeParameter('kind', i) as string;
						let values = this.getNodeParameter('values', i) as string;
						if (typeof values === 'string') {
							values = JSON.parse(values);
						}

						const body: IDataObject = {
							instructions: [
								{
									kind,
									values,
								},
							],
						};
						const headers = {
							'Content-Type': 'application/json; charset=utf-8; domain-model=launchdarkly.semanticpatch',
						};
						responseData = await launchDarklyApiRequest.call(this, 'PATCH', `/segments/${projectKey}/${environmentKey}/${segmentKey}`, body, {}, headers);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);

				} else if (responseData !== undefined) {
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
