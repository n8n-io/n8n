/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-param-reassign */
/* eslint-disable no-continue */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import get from 'lodash.get';
import merge from 'lodash.merge';
import set from 'lodash.set';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	INode,
	INodeExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	IRequestOptionsFromParameters,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	NodeHelpers,
	NodeParameterValue,
	Workflow,
	WorkflowExecuteMode,
} from '.';

import {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nRequestOperations,
	INodeProperties,
	INodePropertyCollection,
} from './Interfaces';

export class RoutingNode {
	additionalData: IWorkflowExecuteAdditionalData;

	connectionInputData: INodeExecutionData[];

	node: INode;

	mode: WorkflowExecuteMode;

	runExecutionData: IRunExecutionData;

	workflow: Workflow;

	constructor(
		workflow: Workflow,
		node: INode,
		connectionInputData: INodeExecutionData[],
		runExecutionData: IRunExecutionData,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
	) {
		this.additionalData = additionalData;
		this.connectionInputData = connectionInputData;
		this.runExecutionData = runExecutionData;
		this.mode = mode;
		this.node = node;
		this.workflow = workflow;
	}

	async runNode(
		inputData: ITaskDataConnections,
		runIndex: number,
		nodeType: INodeType,
		nodeExecuteFunctions: INodeExecuteFunctions,
	): Promise<INodeExecutionData[][] | null | undefined> {
		const items = inputData.main[0] as INodeExecutionData[];
		const returnData: INodeExecutionData[] = [];
		let responseData;

		let credentialType: string | undefined;

		if (nodeType.description.credentials?.length) {
			credentialType = nodeType.description.credentials[0].name;
		}
		const executeFunctions = nodeExecuteFunctions.getExecuteFunctions(
			this.workflow,
			this.runExecutionData,
			runIndex,
			this.connectionInputData,
			inputData,
			this.node,
			this.additionalData,
			this.mode,
		);

		let credentials: ICredentialDataDecryptedObject | undefined;
		if (credentialType) {
			credentials = (await executeFunctions.getCredentials(credentialType)) || {};
		}

		// TODO: Think about how batching could be handled for REST APIs which support it
		for (let i = 0; i < items.length; i++) {
			try {
				const thisArgs = nodeExecuteFunctions.getExecuteSingleFunctions(
					this.workflow,
					this.runExecutionData,
					runIndex,
					this.connectionInputData,
					inputData,
					this.node,
					i,
					this.additionalData,
					this.mode,
				);

				const requestData: IRequestOptionsFromParameters = {
					options: {
						url: '', // TODO: Replace with own type where url is not required
						qs: {},
						body: {},
					},
					preSend: [],
					postReceive: [],
				};

				if (nodeType.description.requestDefaults) {
					Object.assign(requestData.options, nodeType.description.requestDefaults);

					for (const key of Object.keys(nodeType.description.requestDefaults)) {
						// @ts-ignore
						let value = nodeType.description.requestDefaults[key];
						// If the value is an expression resolve it
						value = this.getParameterValue(
							value,
							i,
							runIndex,
							{ $credentials: credentials },
							true,
						) as string;
						// @ts-ignore
						requestData.options[key] = value;
					}
				}

				for (const property of nodeType.description.properties) {
					let value = get(this.node.parameters, property.name, []) as string | NodeParameterValue;
					// If the value is an expression resolve it
					value = this.getParameterValue(
						value,
						i,
						runIndex,
						{ $credentials: credentials },
						true,
					) as string | NodeParameterValue;

					const tempOptions = this.getRequestOptionsFromParameters(
						thisArgs,
						property,
						i,
						runIndex,
						'',
						{ $credentials: credentials, $value: value },
					);
					if (tempOptions) {
						requestData.pagination =
							tempOptions.pagination !== undefined
								? tempOptions.pagination
								: requestData.pagination;

						requestData.maxResults =
							tempOptions.maxResults !== undefined
								? tempOptions.maxResults
								: requestData.maxResults;

						merge(requestData.options, tempOptions.options);
						requestData.preSend.push(...tempOptions.preSend);
						requestData.postReceive.push(...tempOptions.postReceive);
					}
				}

				// TODO: Change to handle some requests in parallel (should be configurable)
				responseData = await this.makeRoutingRequest(
					requestData,
					thisArgs,
					i,
					runIndex,
					credentialType,
					nodeType.description.requestOperations,
				);

				// Add as INodeExecutionData[]
				responseData.forEach((item) => {
					returnData.push({ json: item });
				});
			} catch (error) {
				if (get(this.node, 'continueOnFail', false)) {
					returnData.push({ json: {}, error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	async rawRoutingRequest(
		executeSingleFunctions: IExecuteSingleFunctions,
		requestData: IRequestOptionsFromParameters,
		itemIndex: number,
		runIndex: number,
		credentialType?: string,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<IDataObject[]> {
		let responseData: IDataObject | IDataObject[] | null;

		if (credentialType) {
			responseData = (await executeSingleFunctions.helpers.requestWithAuthentication.call(
				executeSingleFunctions,
				credentialType,
				requestData.options,
				{ credentialsDecrypted },
			)) as IDataObject;
		} else {
			responseData = (await executeSingleFunctions.helpers.httpRequest(
				requestData.options,
			)) as IDataObject;
		}

		for (const postReceiveMethod of requestData.postReceive) {
			if (responseData !== null) {
				if (typeof postReceiveMethod === 'function') {
					responseData = await postReceiveMethod.call(executeSingleFunctions, responseData);
				} else if (postReceiveMethod.type === 'rootProperty') {
					if (Array.isArray(responseData)) {
						responseData = responseData.map((item) => item[postReceiveMethod.properties.property]);
					} else {
						responseData = responseData[postReceiveMethod.properties.property] as IDataObject;
					}
				} else if (postReceiveMethod.type === 'set') {
					const { value } = postReceiveMethod.properties;
					// If the value is an expression resolve it
					responseData = this.getParameterValue(
						value,
						itemIndex,
						runIndex,
						{ $response: responseData },
						false,
					) as INodeParameters;
				}
			}
		}

		if (responseData === null) {
			return [];
		}
		if (Array.isArray(responseData)) {
			return responseData;
		}

		return [responseData];
	}

	async makeRoutingRequest(
		requestData: IRequestOptionsFromParameters,
		executeSingleFunctions: IExecuteSingleFunctions,
		itemIndex: number,
		runIndex: number,
		credentialType?: string,
		requestOperations?: IN8nRequestOperations,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<IDataObject[]> {
		let responseData: IDataObject[];
		for (const preSendMethod of requestData.preSend) {
			requestData.options = await preSendMethod.call(executeSingleFunctions, requestData.options);
		}

		const executePaginationFunctions = {
			...executeSingleFunctions,
			makeRoutingRequest: async (requestOptions: IRequestOptionsFromParameters) => {
				return this.rawRoutingRequest(
					executeSingleFunctions,
					requestOptions,
					itemIndex,
					runIndex,
					credentialType,
					credentialsDecrypted,
				);
			},
		};

		if (requestData.pagination && requestOperations?.pagination) {
			// No pagination

			if (typeof requestOperations.pagination === 'function') {
				// Pagination via function
				responseData = await requestOperations.pagination.call(
					executePaginationFunctions,
					requestData,
				);
			} else {
				// Pagination via JSON properties
				const { properties } = requestOperations.pagination;
				responseData = [];
				if (!requestData.options.qs) {
					requestData.options.qs = {};
				}

				// Different predefined pagination types
				if (requestOperations.pagination.type === 'offset') {
					const optionsType = properties.type === 'body' ? 'body' : 'qs';
					if (properties.type === 'body' && !requestData.options.body) {
						requestData.options.body = {};
					}

					(requestData.options[optionsType] as IDataObject)[properties.limitParameter] =
						properties.pageSize;
					(requestData.options[optionsType] as IDataObject)[properties.offsetParameter] = 0;
					let tempResponseData: IDataObject[];
					do {
						if (requestData?.maxResults) {
							// Only request as many results as needed
							const resultsMissing = (requestData?.maxResults as number) - responseData.length;
							if (resultsMissing < 1) {
								break;
							}
							(requestData.options[optionsType] as IDataObject)[properties.limitParameter] =
								Math.min(properties.pageSize, resultsMissing);
						}

						tempResponseData = await this.rawRoutingRequest(
							executeSingleFunctions,
							requestData,
							itemIndex,
							runIndex,
							credentialType,
							credentialsDecrypted,
						);
						(requestData.options[optionsType] as IDataObject)[properties.offsetParameter] =
							((requestData.options[optionsType] as IDataObject)[
								properties.offsetParameter
							] as number) + properties.pageSize;

						if (properties.rootProperty) {
							tempResponseData = get(
								tempResponseData[0],
								properties.rootProperty,
								[],
							) as IDataObject[];
						}

						responseData.push(...tempResponseData);
					} while (tempResponseData.length && tempResponseData.length === properties.pageSize);
				}
			}
		} else {
			// No pagination
			responseData = await this.rawRoutingRequest(
				executeSingleFunctions,
				requestData,
				itemIndex,
				runIndex,
				credentialType,
				credentialsDecrypted,
			);
		}
		return responseData;
	}

	getParameterValue(
		parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		itemIndex: number,
		runIndex: number,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | string {
		if (typeof parameterValue === 'string' && parameterValue.charAt(0) === '=') {
			return this.workflow.expression.getParameterValue(
				parameterValue,
				this.runExecutionData ?? null,
				runIndex,
				itemIndex,
				this.node.name,
				this.connectionInputData,
				this.mode,
				additionalKeys ?? {},
				returnObjectAsString,
			);
		}

		return parameterValue;
	}

	getRequestOptionsFromParameters(
		executeSingleFunctions: IExecuteSingleFunctions,
		nodeProperties: INodeProperties | INodePropertyOptions,
		itemIndex: number,
		runIndex: number,
		path: string,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
	): IRequestOptionsFromParameters | undefined {
		const returnData: IRequestOptionsFromParameters = {
			// @ts-ignore
			options: {
				// Do not uncomment, else it will overwrite url always to empty!
				// url: '', // TODO: Replace with own type where url is not required
				qs: {},
				body: {},
			},
			preSend: [],
			postReceive: [],
		};
		let basePath = path ? `${path}.` : '';

		if (!NodeHelpers.displayParameter(this.node.parameters, nodeProperties, this.node.parameters)) {
			return undefined;
		}

		if (nodeProperties.request) {
			for (const key of Object.keys(nodeProperties.request)) {
				// @ts-ignore
				let value = nodeProperties.request[key];
				// If the value is an expression resolve it
				value = this.getParameterValue(value, itemIndex, runIndex, additionalKeys, true) as string;
				// @ts-ignore
				returnData.options[key] = value;
			}
		}

		if (nodeProperties.requestProperty) {
			let propertyName = nodeProperties.requestProperty.property;
			if (propertyName !== undefined) {
				// If the propertyName is an expression resolve it
				propertyName = this.getParameterValue(
					propertyName,
					itemIndex,
					runIndex,
					additionalKeys,
					true,
				) as string;

				let value = executeSingleFunctions.getNodeParameter(
					basePath + nodeProperties.name,
					itemIndex,
				) as string;

				if (nodeProperties.requestProperty.value) {
					const valueString = nodeProperties.requestProperty.value;
					// Special value got set
					// If the valueString is an expression resolve it
					value = this.getParameterValue(
						valueString,
						itemIndex,
						runIndex,
						{ ...additionalKeys, $value: value },
						true,
					) as string;
				}

				if (nodeProperties.requestProperty.type === 'query') {
					if (nodeProperties.requestProperty.propertyInDotNotation === false) {
						returnData.options.qs![propertyName] = value;
					} else {
						set(returnData.options.qs as object, propertyName, value);
					}
				} else if (nodeProperties.requestProperty.type === 'body') {
					// eslint-disable-next-line no-lonely-if
					if (nodeProperties.requestProperty.propertyInDotNotation === false) {
						// @ts-ignore
						returnData.options.body![propertyName] = value;
					} else {
						set(returnData.options.body as object, propertyName, value);
					}
				}
			}

			if (nodeProperties.requestProperty.pagination !== undefined) {
				let paginationValue = nodeProperties.requestProperty.pagination;
				if (typeof paginationValue === 'string' && paginationValue.charAt(0) === '=') {
					// If the propertyName is an expression resolve it
					const value = executeSingleFunctions.getNodeParameter(
						basePath + nodeProperties.name,
						itemIndex,
					) as string;

					paginationValue = this.getParameterValue(
						paginationValue,
						itemIndex,
						runIndex,
						{ ...additionalKeys, $value: value },
						true,
					) as string;
				}

				returnData.pagination = !!paginationValue;
			}

			if (nodeProperties.requestProperty.maxResults !== undefined) {
				let maxResultsValue = nodeProperties.requestProperty.maxResults;
				if (typeof maxResultsValue === 'string' && maxResultsValue.charAt(0) === '=') {
					// If the propertyName is an expression resolve it
					const value = executeSingleFunctions.getNodeParameter(
						basePath + nodeProperties.name,
						itemIndex,
					) as number;

					maxResultsValue = this.getParameterValue(
						maxResultsValue,
						itemIndex,
						runIndex,
						{ ...additionalKeys, $value: value },
						true,
					) as string;
				}

				returnData.maxResults = maxResultsValue;
			}

			if (nodeProperties.requestProperty.preSend) {
				returnData.preSend.push(nodeProperties.requestProperty.preSend);
			}
			if (nodeProperties.requestProperty.postReceive) {
				returnData.postReceive.push(nodeProperties.requestProperty.postReceive);
			}
		}

		// Check if there are any child properties
		if (!Object.prototype.hasOwnProperty.call(nodeProperties, 'options')) {
			// There are none so nothing else to check
			return returnData;
		}

		// Everything after this point can only be of type INodeProperties
		nodeProperties = nodeProperties as INodeProperties;

		// Check the child parameters
		let value;
		if (nodeProperties.type === 'options') {
			const optionValue = NodeHelpers.getParameterValueByPath(
				this.node.parameters,
				nodeProperties.name,
				basePath.slice(0, -1),
			);

			// Find the selected option
			const selectedOption = (nodeProperties.options as INodePropertyOptions[]).filter(
				(option) => option.value === optionValue,
			);

			if (selectedOption.length) {
				// Check only if option is set and if of type INodeProperties
				const tempOptions = this.getRequestOptionsFromParameters(
					executeSingleFunctions,
					selectedOption[0],
					itemIndex,
					runIndex,
					`${basePath}${nodeProperties.name}`,
					{ $value: optionValue },
				);

				if (tempOptions) {
					returnData.pagination = returnData.pagination ?? tempOptions.pagination;
					returnData.maxResults = returnData.maxResults ?? tempOptions.maxResults;
					merge(returnData.options, tempOptions.options);
					returnData.preSend.push(...tempOptions.preSend);
					returnData.postReceive.push(...tempOptions.postReceive);
				}
			}
		} else if (nodeProperties.type === 'collection') {
			value = NodeHelpers.getParameterValueByPath(
				this.node.parameters,
				nodeProperties.name,
				basePath.slice(0, -1),
			);

			for (const propertyOption of nodeProperties.options as INodeProperties[]) {
				if (
					Object.keys(value as IDataObject).includes(propertyOption.name) &&
					propertyOption.type !== undefined
				) {
					// Check only if option is set and if of type INodeProperties
					const tempOptions = this.getRequestOptionsFromParameters(
						executeSingleFunctions,
						propertyOption,
						itemIndex,
						runIndex,
						`${basePath}${nodeProperties.name}`,
					);

					if (tempOptions) {
						returnData.pagination = returnData.pagination ?? tempOptions.pagination;
						returnData.maxResults = returnData.maxResults ?? tempOptions.maxResults;
						merge(returnData.options, tempOptions.options);
						returnData.preSend.push(...tempOptions.preSend);
						returnData.postReceive.push(...tempOptions.postReceive);
					}
				}
			}
		} else if (nodeProperties.type === 'fixedCollection') {
			basePath = `${basePath}${nodeProperties.name}.`;
			for (const propertyOptions of nodeProperties.options as INodePropertyCollection[]) {
				// Check if the option got set and if not skip it
				value = NodeHelpers.getParameterValueByPath(
					this.node.parameters,
					propertyOptions.name,
					basePath.slice(0, -1),
				);

				if (value === undefined) {
					continue;
				}

				// Make sure that it is always an array to be able to use the same code for multi and single
				if (!Array.isArray(value)) {
					value = [value];
				}

				const loopBasePath = `${basePath}${propertyOptions.name}`;
				for (let i = 0; i < (value as INodeParameters[]).length; i++) {
					for (const option of propertyOptions.values) {
						const tempOptions = this.getRequestOptionsFromParameters(
							executeSingleFunctions,
							option,
							itemIndex,
							runIndex,
							nodeProperties.typeOptions?.multipleValues ? `${loopBasePath}[${i}]` : loopBasePath,
							{ ...(additionalKeys || {}), $index: i, $self: value[i] },
						);

						if (tempOptions) {
							returnData.pagination = returnData.pagination ?? tempOptions.pagination;
							returnData.maxResults = returnData.maxResults ?? tempOptions.maxResults;
							merge(returnData.options, tempOptions.options);
							returnData.preSend.push(...tempOptions.preSend);
							returnData.postReceive.push(...tempOptions.postReceive);
						}
					}
				}
			}
		}

		return returnData;
	}
}
