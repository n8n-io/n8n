import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { buildFields, buildOperations } from './BuildDescription';
import { travisciApiRequest, travisciApiRequestAllItems } from './GenericFunctions';

export class TravisCi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TravisCI',
		name: 'travisCi',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:travisci.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume TravisCI API',
		defaults: {
			name: 'TravisCI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'travisCiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Build',
						value: 'build',
					},
				],
				default: 'build',
			},
			...buildOperations,
			...buildFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'build') {
					//https://developer.travis-ci.com/resource/build#find
					if (operation === 'get') {
						const buildId = this.getNodeParameter('buildId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.include) {
							qs.include = additionalFields.include as string;
						}

						responseData = await travisciApiRequest.call(this, 'GET', `/build/${buildId}`, {}, qs);
					}
					//https://developer.travis-ci.com/resource/builds#for_current_user
					if (operation === 'getAll') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const returnAll = this.getNodeParameter('returnAll', i);

						if (additionalFields.sortBy) {
							qs.sort_by = additionalFields.sortBy;
						}

						if (additionalFields.sortBy && additionalFields.order) {
							qs.sort_by = `${additionalFields.sortBy}:${additionalFields.order}`;
						}

						if (additionalFields.include) {
							qs.include = additionalFields.include;
						}

						if (returnAll) {
							responseData = await travisciApiRequestAllItems.call(
								this,
								'builds',
								'GET',
								'/builds',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await travisciApiRequest.call(this, 'GET', '/builds', {}, qs);
							responseData = responseData.builds;
						}
					}
					//https://developer.travis-ci.com/resource/build#cancel
					if (operation === 'cancel') {
						const buildId = this.getNodeParameter('buildId', i) as string;
						responseData = await travisciApiRequest.call(
							this,
							'POST',
							`/build/${buildId}/cancel`,
							{},
							qs,
						);
					}
					//https://developer.travis-ci.com/resource/build#restart
					if (operation === 'restart') {
						const buildId = this.getNodeParameter('buildId', i) as string;
						responseData = await travisciApiRequest.call(
							this,
							'POST',
							`/build/${buildId}/restart`,
							{},
							qs,
						);
					}
					//https://developer.travis-ci.com/resource/requests#create
					if (operation === 'trigger') {
						let slug = this.getNodeParameter('slug', i) as string;
						const branch = this.getNodeParameter('branch', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						slug = slug.replace(new RegExp(/\//g), '%2F');

						const request: IDataObject = {
							branch,
						};

						if (additionalFields.message) {
							request.message = additionalFields.message as string;
						}

						if (additionalFields.mergeMode) {
							request.merge_mode = additionalFields.mergeMode as string;
						}

						responseData = await travisciApiRequest.call(
							this,
							'POST',
							`/repo/${slug}/requests`,
							JSON.stringify({ request }),
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
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
