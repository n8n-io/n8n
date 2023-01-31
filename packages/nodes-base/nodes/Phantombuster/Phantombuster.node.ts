import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { phantombusterApiRequest, validateJSON } from './GenericFunctions';

import { agentFields, agentOperations } from './AgentDescription';

// import {
// 	sentenceCase,
// } from 'change-case';

export class Phantombuster implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Phantombuster',
		name: 'phantombuster',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:phantombuster.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Phantombuster API',
		defaults: {
			name: 'Phantombuster',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'phantombusterApi',
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
						name: 'Agent',
						value: 'agent',
					},
				],
				default: 'agent',
			},
			...agentOperations,
			...agentFields,
		],
	};

	methods = {
		loadOptions: {
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const responseData = await phantombusterApiRequest.call(this, 'GET', '/agents/fetch-all');

				for (const item of responseData) {
					returnData.push({
						name: item.name,
						value: item.id,
					});
				}
				return returnData;
			},

			// Get all the arguments to display them to user so that he can
			// select them easily
			// async getArguments(
			// 	this: ILoadOptionsFunctions,
			// ): Promise<INodePropertyOptions[]> {
			// 	const returnData: INodePropertyOptions[] = [];
			// 	const agentId = this.getCurrentNodeParameter('agentId') as string;

			// 	const { argument } = await phantombusterApiRequest.call(
			// 		this,
			// 		'GET',
			// 		'/agents/fetch',
			// 		{},
			// 		{ id: agentId },
			// 	);

			// 	for (const key of Object.keys(JSON.parse(argument))) {
			// 		returnData.push({
			// 			name: sentenceCase(key),
			// 			value: key,
			// 		});
			// 	}
			// 	return returnData;
			// },
		},
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
				if (resource === 'agent') {
					//https://hub.phantombuster.com/reference#post_agents-delete-1
					if (operation === 'delete') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = await phantombusterApiRequest.call(this, 'POST', '/agents/delete', {
							id: agentId,
						});

						responseData = { success: true };
					}
					//https://hub.phantombuster.com/reference#get_agents-fetch-1
					if (operation === 'get') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						responseData = await phantombusterApiRequest.call(
							this,
							'GET',
							'/agents/fetch',
							{},
							{ id: agentId },
						);
					}
					//https://hub.phantombuster.com/reference#get_agents-fetch-output-1
					if (operation === 'getOutput') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						const resolveData = this.getNodeParameter('resolveData', i);

						const additionalFields = this.getNodeParameter('additionalFields', i);

						Object.assign(qs, additionalFields);

						qs.id = agentId;

						responseData = await phantombusterApiRequest.call(
							this,
							'GET',
							'/agents/fetch-output',
							{},
							qs,
						);

						if (resolveData) {
							const { resultObject } = await phantombusterApiRequest.call(
								this,
								'GET',
								'/containers/fetch-result-object',
								{},
								{ id: responseData.containerId },
							);

							if (resultObject === null) {
								responseData = {};
							} else {
								responseData = JSON.parse(resultObject);
							}
						}
					}
					//https://api.phantombuster.com/api/v2/agents/fetch-all
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await phantombusterApiRequest.call(this, 'GET', '/agents/fetch-all');

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.splice(0, limit);
						}
					}
					//https://hub.phantombuster.com/reference#post_agents-launch-1
					if (operation === 'launch') {
						const agentId = this.getNodeParameter('agentId', i) as string;

						const jsonParameters = this.getNodeParameter('jsonParameters', i);

						const resolveData = this.getNodeParameter('resolveData', i);

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							id: agentId,
						};

						if (jsonParameters) {
							if (additionalFields.argumentsJson) {
								body.arguments = validateJSON(
									this,
									additionalFields.argumentsJson as string,
									'Arguments',
								);

								delete additionalFields.argumentsJson;
							}
							if (additionalFields.bonusArgumentJson) {
								body.bonusArgument = validateJSON(
									this,
									additionalFields.bonusArgumentJson as string,
									'Bonus Argument',
								);
								delete additionalFields.bonusArgumentJson;
							}
						} else {
							const argumentParameters =
								((additionalFields.argumentsUi as IDataObject)?.argumentValues as IDataObject[]) ||
								[];
							body.arguments = argumentParameters.reduce((object, currentValue) => {
								object[currentValue.key as string] = currentValue.value;
								return object;
							}, {});
							delete additionalFields.argumentsUi;

							const bonusParameters =
								((additionalFields.bonusArgumentUi as IDataObject)
									?.bonusArgumentValue as IDataObject[]) || [];
							body.bonusArgument = bonusParameters.reduce((object, currentValue) => {
								object[currentValue.key as string] = currentValue.value;
								return object;
							}, {});
							delete additionalFields.bonusArgumentUi;
						}

						Object.assign(body, additionalFields);

						responseData = await phantombusterApiRequest.call(this, 'POST', '/agents/launch', body);

						if (resolveData) {
							responseData = await phantombusterApiRequest.call(
								this,
								'GET',
								'/containers/fetch',
								{},
								{ id: responseData.containerId },
							);
						}
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
