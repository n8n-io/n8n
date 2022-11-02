/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INode,
	INodeExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	DeclarativeRestApiSettings,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	NodeParameterValue,
	WorkflowExecuteMode,
	IDataObject,
	IExecuteData,
	IExecuteSingleFunctions,
	IN8nRequestOperations,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
	PostReceiveAction,
} from './Interfaces';
import { NodeApiError, NodeOperationError } from './NodeErrors';
import * as NodeHelpers from './NodeHelpers';

import type { Workflow } from '.';

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
		executeData: IExecuteData,
		nodeExecuteFunctions: INodeExecuteFunctions,
		credentialsDecrypted?: ICredentialsDecrypted,
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
			executeData,
			this.mode,
		);

		let credentials: ICredentialDataDecryptedObject | undefined;
		if (credentialsDecrypted) {
			credentials = credentialsDecrypted.data;
		} else if (credentialType) {
			try {
				credentials = (await executeFunctions.getCredentials(credentialType)) || {};
			} catch (error) {
				if (
					nodeType.description.credentials?.length &&
					nodeType.description.credentials[0].required
				) {
					// Only throw error if credential is mandatory
					throw error;
				} else {
					// Do not request cred type since it doesn't exist
					credentialType = undefined;
				}
			}
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
					executeData,
					this.mode,
				);
				const requestData: DeclarativeRestApiSettings.ResultOptions = {
					options: {
						qs: {},
						body: {},
						headers: {},
					},
					preSend: [],
					postReceive: [],
					requestOperations: {},
				};

				if (nodeType.description.requestOperations) {
					requestData.requestOperations = { ...nodeType.description.requestOperations };
				}

				if (nodeType.description.requestDefaults) {
					for (const key of Object.keys(nodeType.description.requestDefaults)) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						let value = (nodeType.description.requestDefaults as Record<string, any>)[key];
						// If the value is an expression resolve it
						value = this.getParameterValue(
							value,
							i,
							runIndex,
							executeData,
							{ $credentials: credentials, $version: this.node.typeVersion },
							false,
						) as string;
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(requestData.options as Record<string, any>)[key] = value;
					}
				}

				for (const property of nodeType.description.properties) {
					let value = get(this.node.parameters, property.name, []) as string | NodeParameterValue;
					// If the value is an expression resolve it
					value = this.getParameterValue(
						value,
						i,
						runIndex,
						executeData,
						{ $credentials: credentials, $version: this.node.typeVersion },
						true,
					) as string | NodeParameterValue;

					const tempOptions = this.getRequestOptionsFromParameters(
						thisArgs,
						property,
						i,
						runIndex,
						'',
						{ $credentials: credentials, $value: value, $version: this.node.typeVersion },
					);

					this.mergeOptions(requestData, tempOptions);
				}

				// TODO: Change to handle some requests in parallel (should be configurable)
				responseData = await this.makeRoutingRequest(
					requestData,
					thisArgs,
					i,
					runIndex,
					credentialType,
					requestData.requestOperations,
					credentialsDecrypted,
				);

				if (requestData.maxResults) {
					// Remove not needed items in case APIs return to many
					responseData.splice(requestData.maxResults as number);
				}

				returnData.push(...responseData);
			} catch (error) {
				if (get(this.node, 'continueOnFail', false)) {
					returnData.push({ json: {}, error: error.message });
					continue;
				}
				throw new NodeApiError(this.node, error, {
					runIndex,
					itemIndex: i,
					message: error?.message,
					description: error?.description,
				});
			}
		}

		return [returnData];
	}

	mergeOptions(
		destinationOptions: DeclarativeRestApiSettings.ResultOptions,
		sourceOptions?: DeclarativeRestApiSettings.ResultOptions,
	): void {
		if (sourceOptions) {
			destinationOptions.paginate = destinationOptions.paginate ?? sourceOptions.paginate;
			destinationOptions.maxResults = sourceOptions.maxResults
				? sourceOptions.maxResults
				: destinationOptions.maxResults;
			merge(destinationOptions.options, sourceOptions.options);
			destinationOptions.preSend.push(...sourceOptions.preSend);
			destinationOptions.postReceive.push(...sourceOptions.postReceive);
			if (sourceOptions.requestOperations && destinationOptions.requestOperations) {
				destinationOptions.requestOperations = Object.assign(
					destinationOptions.requestOperations,
					sourceOptions.requestOperations,
				);
			}
		}
	}

	async runPostReceiveAction(
		executeSingleFunctions: IExecuteSingleFunctions,
		action: PostReceiveAction,
		inputData: INodeExecutionData[],
		responseData: IN8nHttpFullResponse,
		parameterValue: string | IDataObject | undefined,
		itemIndex: number,
		runIndex: number,
	): Promise<INodeExecutionData[]> {
		if (typeof action === 'function') {
			return action.call(executeSingleFunctions, inputData, responseData);
		}
		if (action.type === 'rootProperty') {
			try {
				return inputData.flatMap((item) => {
					// let itemContent = item.json[action.properties.property];
					let itemContent = get(item.json, action.properties.property);

					if (!Array.isArray(itemContent)) {
						itemContent = [itemContent];
					}
					return (itemContent as IDataObject[]).map((json) => {
						return {
							json,
						};
					});
				});
			} catch (error) {
				throw new NodeOperationError(this.node, error, {
					runIndex,
					itemIndex,
					description: `The rootProperty "${action.properties.property}" could not be found on item.`,
				});
			}
		}
		if (action.type === 'limit') {
			const maxResults = this.getParameterValue(
				action.properties.maxResults,
				itemIndex,
				runIndex,
				executeSingleFunctions.getExecuteData(),
				{ $response: responseData, $value: parameterValue, $version: this.node.typeVersion },
				false,
			) as string;
			return inputData.slice(0, parseInt(maxResults, 10));
		}
		if (action.type === 'set') {
			const { value } = action.properties;
			// If the value is an expression resolve it
			return [
				{
					json: this.getParameterValue(
						value,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						{ $response: responseData, $value: parameterValue, $version: this.node.typeVersion },
						false,
					) as IDataObject,
				},
			];
		}
		if (action.type === 'sort') {
			// Sort the returned options
			const sortKey = action.properties.key;
			inputData.sort((a, b) => {
				const aSortValue = a.json[sortKey]
					? (a.json[sortKey]?.toString().toLowerCase() as string)
					: '';
				const bSortValue = b.json[sortKey]
					? (b.json[sortKey]?.toString().toLowerCase() as string)
					: '';
				if (aSortValue < bSortValue) {
					return -1;
				}
				if (aSortValue > bSortValue) {
					return 1;
				}
				return 0;
			});

			return inputData;
		}
		if (action.type === 'setKeyValue') {
			const returnData: INodeExecutionData[] = [];

			// eslint-disable-next-line @typescript-eslint/no-loop-func
			inputData.forEach((item) => {
				const returnItem: IDataObject = {};
				for (const key of Object.keys(action.properties)) {
					let propertyValue = (
						action.properties as Record<
							string,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							any
						>
					)[key];
					// If the value is an expression resolve it
					propertyValue = this.getParameterValue(
						propertyValue,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						{
							$response: responseData,
							$responseItem: item.json,
							$value: parameterValue,
							$version: this.node.typeVersion,
						},
						true,
					) as string;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(returnItem as Record<string, any>)[key] = propertyValue;
				}
				returnData.push({ json: returnItem });
			});

			return returnData;
		}
		if (action.type === 'binaryData') {
			responseData.body = Buffer.from(responseData.body as string);
			let { destinationProperty } = action.properties;

			destinationProperty = this.getParameterValue(
				destinationProperty,
				itemIndex,
				runIndex,
				executeSingleFunctions.getExecuteData(),
				{ $response: responseData, $value: parameterValue, $version: this.node.typeVersion },
				false,
			) as string;

			const binaryData = await executeSingleFunctions.helpers.prepareBinaryData(responseData.body);

			return inputData.map((item) => {
				if (typeof item.json === 'string') {
					// By default is probably the binary data as string set, in this case remove it
					item.json = {};
				}

				item.binary = {
					[destinationProperty]: binaryData,
				};

				return item;
			});
		}

		return [];
	}

	async rawRoutingRequest(
		executeSingleFunctions: IExecuteSingleFunctions,
		requestData: DeclarativeRestApiSettings.ResultOptions,
		itemIndex: number,
		runIndex: number,
		credentialType?: string,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<INodeExecutionData[]> {
		let responseData: IN8nHttpFullResponse;
		requestData.options.returnFullResponse = true;
		if (credentialType) {
			responseData = (await executeSingleFunctions.helpers.httpRequestWithAuthentication.call(
				executeSingleFunctions,
				credentialType,
				requestData.options as IHttpRequestOptions,
				{ credentialsDecrypted },
			)) as IN8nHttpFullResponse;
		} else {
			responseData = (await executeSingleFunctions.helpers.httpRequest(
				requestData.options as IHttpRequestOptions,
			)) as IN8nHttpFullResponse;
		}
		let returnData: INodeExecutionData[] = [
			{
				json: responseData.body as IDataObject,
			},
		];

		if (requestData.postReceive.length) {
			// If postReceive functionality got defined execute all of them
			for (const postReceiveMethod of requestData.postReceive) {
				for (const action of postReceiveMethod.actions) {
					returnData = await this.runPostReceiveAction(
						executeSingleFunctions,
						action,
						returnData,
						responseData,
						postReceiveMethod.data.parameterValue,
						itemIndex,
						runIndex,
					);
				}
			}
		} else {
			// No postReceive functionality got defined so simply add data as it is
			// eslint-disable-next-line no-lonely-if
			if (Array.isArray(responseData.body)) {
				returnData = responseData.body.map((json) => {
					return {
						json,
					} as INodeExecutionData;
				});
			} else {
				returnData[0].json = responseData.body as IDataObject;
			}
		}

		return returnData;
	}

	async makeRoutingRequest(
		requestData: DeclarativeRestApiSettings.ResultOptions,
		executeSingleFunctions: IExecuteSingleFunctions,
		itemIndex: number,
		runIndex: number,
		credentialType?: string,
		requestOperations?: IN8nRequestOperations,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<INodeExecutionData[]> {
		let responseData: INodeExecutionData[];
		for (const preSendMethod of requestData.preSend) {
			requestData.options = await preSendMethod.call(
				executeSingleFunctions,
				requestData.options as IHttpRequestOptions,
			);
		}

		const executePaginationFunctions = {
			...executeSingleFunctions,
			makeRoutingRequest: async (requestOptions: DeclarativeRestApiSettings.ResultOptions) => {
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

		if (requestData.paginate && requestOperations?.pagination) {
			// Has pagination

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
					let tempResponseData: INodeExecutionData[];
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
							const tempResponseValue = get(tempResponseData[0].json, properties.rootProperty) as
								| IDataObject[]
								| undefined;
							if (tempResponseValue === undefined) {
								throw new NodeOperationError(
									this.node,
									`The rootProperty "${properties.rootProperty}" could not be found on item.`,
									{ runIndex, itemIndex },
								);
							}

							tempResponseData = tempResponseValue.map((item) => {
								return {
									json: item,
								};
							});
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
		parameterValue: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValueType {
		if (
			typeof parameterValue === 'object' ||
			(typeof parameterValue === 'string' && parameterValue.charAt(0) === '=')
		) {
			return this.workflow.expression.getParameterValue(
				parameterValue,
				this.runExecutionData ?? null,
				runIndex,
				itemIndex,
				this.node.name,
				this.connectionInputData,
				this.mode,
				this.additionalData.timezone,
				additionalKeys ?? {},
				executeData,
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
	): DeclarativeRestApiSettings.ResultOptions | undefined {
		const returnData: DeclarativeRestApiSettings.ResultOptions = {
			options: {
				qs: {},
				body: {},
				headers: {},
			},
			preSend: [],
			postReceive: [],
			requestOperations: {},
		};
		let basePath = path ? `${path}.` : '';

		if (
			!NodeHelpers.displayParameter(
				this.node.parameters,
				nodeProperties,
				this.node,
				this.node.parameters,
			)
		) {
			return undefined;
		}
		if (nodeProperties.routing) {
			let parameterValue: string | undefined;
			if (basePath + nodeProperties.name && 'type' in nodeProperties) {
				// Extract value if it has extractValue defined or if it's a
				// resourceLocator component. Resource locators are likely to have extractors
				// and we can't know if the mode has one unless we dig all the way in.
				const shouldExtractValue =
					nodeProperties.extractValue !== undefined || nodeProperties.type === 'resourceLocator';
				parameterValue = executeSingleFunctions.getNodeParameter(
					basePath + nodeProperties.name,
					undefined,
					{ extractValue: shouldExtractValue },
				) as string;
			}

			if (nodeProperties.routing.operations) {
				returnData.requestOperations = { ...nodeProperties.routing.operations };
			}
			if (nodeProperties.routing.request) {
				for (const key of Object.keys(nodeProperties.routing.request)) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let propertyValue = (nodeProperties.routing.request as Record<string, any>)[key];
					// If the value is an expression resolve it
					propertyValue = this.getParameterValue(
						propertyValue,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						{ ...additionalKeys, $value: parameterValue },
						false,
					) as string;

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(returnData.options as Record<string, any>)[key] = propertyValue;
				}
			}

			if (nodeProperties.routing.send) {
				let propertyName = nodeProperties.routing.send.property;
				if (propertyName !== undefined) {
					// If the propertyName is an expression resolve it
					propertyName = this.getParameterValue(
						propertyName,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						additionalKeys,
						true,
					) as string;

					let value = parameterValue;

					if (nodeProperties.routing.send.value) {
						const valueString = nodeProperties.routing.send.value;
						// Special value got set
						// If the valueString is an expression resolve it
						value = this.getParameterValue(
							valueString,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							{ ...additionalKeys, $value: value },
							true,
						) as string;
					}

					if (nodeProperties.routing.send.type === 'body') {
						// Send in "body"
						// eslint-disable-next-line no-lonely-if
						if (nodeProperties.routing.send.propertyInDotNotation === false) {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(returnData.options.body as Record<string, any>)![propertyName] = value;
						} else {
							set(returnData.options.body as object, propertyName, value);
						}
					} else {
						// Send in "query"
						// eslint-disable-next-line no-lonely-if
						if (nodeProperties.routing.send.propertyInDotNotation === false) {
							returnData.options.qs![propertyName] = value;
						} else {
							set(returnData.options.qs as object, propertyName, value);
						}
					}
				}

				if (nodeProperties.routing.send.paginate !== undefined) {
					let paginateValue = nodeProperties.routing.send.paginate;
					if (typeof paginateValue === 'string' && paginateValue.charAt(0) === '=') {
						// If the propertyName is an expression resolve it
						paginateValue = this.getParameterValue(
							paginateValue,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							{ ...additionalKeys, $value: parameterValue },
							true,
						) as string;
					}

					returnData.paginate = !!paginateValue;
				}

				if (nodeProperties.routing.send.preSend) {
					returnData.preSend.push(...nodeProperties.routing.send.preSend);
				}
			}
			if (nodeProperties.routing.output) {
				if (nodeProperties.routing.output.maxResults !== undefined) {
					let maxResultsValue = nodeProperties.routing.output.maxResults;
					if (typeof maxResultsValue === 'string' && maxResultsValue.charAt(0) === '=') {
						// If the propertyName is an expression resolve it
						maxResultsValue = this.getParameterValue(
							maxResultsValue,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							{ ...additionalKeys, $value: parameterValue },
							true,
						) as string;
					}

					returnData.maxResults = maxResultsValue;
				}

				if (nodeProperties.routing.output.postReceive) {
					const postReceiveActions = nodeProperties.routing.output.postReceive.filter((action) => {
						if (typeof action === 'function') {
							return true;
						}

						if (typeof action.enabled === 'string' && action.enabled.charAt(0) === '=') {
							// If the propertyName is an expression resolve it
							return this.getParameterValue(
								action.enabled,
								itemIndex,
								runIndex,
								executeSingleFunctions.getExecuteData(),
								{ ...additionalKeys, $value: parameterValue },
								true,
							) as boolean;
						}

						return action.enabled !== false;
					});

					if (postReceiveActions.length) {
						returnData.postReceive.push({
							data: {
								parameterValue,
							},
							actions: postReceiveActions,
						});
					}
				}
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
					{ $value: optionValue, $version: this.node.typeVersion },
				);

				this.mergeOptions(returnData, tempOptions);
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
						{ $version: this.node.typeVersion },
					);

					this.mergeOptions(returnData, tempOptions);
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

				// Resolve expressions
				value = this.getParameterValue(
					value as INodeParameters[],
					itemIndex,
					runIndex,
					executeSingleFunctions.getExecuteData(),
					{ ...additionalKeys },
					false,
				) as INodeParameters[];

				const loopBasePath = `${basePath}${propertyOptions.name}`;
				for (let i = 0; i < value.length; i++) {
					for (const option of propertyOptions.values) {
						const tempOptions = this.getRequestOptionsFromParameters(
							executeSingleFunctions,
							option,
							itemIndex,
							runIndex,
							nodeProperties.typeOptions?.multipleValues ? `${loopBasePath}[${i}]` : loopBasePath,
							{ ...(additionalKeys || {}), $index: i, $parent: value[i] },
						);

						this.mergeOptions(returnData, tempOptions);
					}
				}
			}
		}
		return returnData;
	}
}
