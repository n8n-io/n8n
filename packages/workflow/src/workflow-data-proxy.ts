/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import * as jmespath from 'jmespath';
import { DateTime, Duration, Interval, Settings } from 'luxon';

import { augmentArray, augmentObject } from './augment-object';
import { AGENT_LANGCHAIN_NODE_TYPE, SCRIPTING_NODE_TYPES } from './constants';
import { ApplicationError } from '@n8n/errors';
import { ExpressionError, type ExpressionErrorOptions } from './errors/expression.error';
import { getGlobalState } from './global-state';
import { NodeConnectionTypes } from './interfaces';
import type {
	IDataObject,
	IExecuteData,
	INodeExecutionData,
	INodeParameters,
	IPairedItemData,
	IRunExecutionData,
	ISourceData,
	ITaskData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	NodeParameterValueType,
	WorkflowExecuteMode,
	ProxyInput,
	INode,
} from './interfaces';
import * as NodeHelpers from './node-helpers';
import { createResultError, createResultOk } from './result';
import { isResourceLocatorValue } from './type-guards';
import { deepCopy, isObjectEmpty } from './utils';
import type { Workflow } from './workflow';
import type { EnvProviderState } from './workflow-data-proxy-env-provider';
import { createEnvProvider, createEnvProviderState } from './workflow-data-proxy-env-provider';
import { getPinDataIfManualExecution } from './workflow-data-proxy-helpers';

const isScriptingNode = (nodeName: string, workflow: Workflow) => {
	const node = workflow.getNode(nodeName);

	return node && SCRIPTING_NODE_TYPES.includes(node.type);
};

const PAIRED_ITEM_METHOD = {
	PAIRED_ITEM: 'pairedItem',
	ITEM_MATCHING: 'itemMatching',
	ITEM: 'item',
	$GET_PAIRED_ITEM: '$getPairedItem',
} as const;

type PairedItemMethod = (typeof PAIRED_ITEM_METHOD)[keyof typeof PAIRED_ITEM_METHOD];

export class WorkflowDataProxy {
	private runExecutionData: IRunExecutionData | null;

	private connectionInputData: INodeExecutionData[];

	private timezone: string;

	// TODO: Clean that up at some point and move all the options into an options object
	constructor(
		private workflow: Workflow,
		runExecutionData: IRunExecutionData | null,
		private runIndex: number,
		private itemIndex: number,
		private activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		private siblingParameters: INodeParameters,
		private mode: WorkflowExecuteMode,
		private additionalKeys: IWorkflowDataProxyAdditionalKeys,
		private executeData?: IExecuteData,
		private defaultReturnRunIndex = -1,
		private selfData: IDataObject = {},
		private contextNodeName: string = activeNodeName,
		private envProviderState?: EnvProviderState,
	) {
		this.runExecutionData = isScriptingNode(this.contextNodeName, workflow)
			? runExecutionData !== null
				? augmentObject(runExecutionData)
				: null
			: runExecutionData;

		this.connectionInputData = isScriptingNode(this.contextNodeName, workflow)
			? augmentArray(connectionInputData)
			: connectionInputData;

		this.timezone = workflow.settings?.timezone ?? getGlobalState().defaultTimezone;
		Settings.defaultZone = this.timezone;
	}

	/**
	 * Returns a proxy which allows to query context data of a given node
	 *
	 * @private
	 * @param {string} nodeName The name of the node to get the context from
	 */
	private nodeContextGetter(nodeName: string) {
		const that = this;
		const node = this.workflow.nodes[nodeName];

		if (!that.runExecutionData?.executionData && that.connectionInputData.length > 0) {
			return {}; // incoming connection has pinned data, so stub context object
		}

		if (!that.runExecutionData?.executionData && !that.runExecutionData?.resultData) {
			throw new ExpressionError(
				"The workflow hasn't been executed yet, so you can't reference any context data",
				{
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
					type: 'no_execution_data',
				},
			);
		}

		return new Proxy(
			{},
			{
				has: () => true,
				ownKeys(target) {
					if (Reflect.ownKeys(target).length === 0) {
						// Target object did not get set yet
						Object.assign(target, NodeHelpers.getContext(that.runExecutionData!, 'node', node));
					}

					return Reflect.ownKeys(target);
				},
				getOwnPropertyDescriptor() {
					return {
						enumerable: true,
						configurable: true,
					};
				},
				get(_, name) {
					if (name === 'isProxy') return true;

					name = name.toString();
					const contextData = NodeHelpers.getContext(that.runExecutionData!, 'node', node);

					return contextData[name];
				},
			},
		);
	}

	private selfGetter() {
		const that = this;

		return new Proxy(
			{},
			{
				has: () => true,
				ownKeys(target) {
					return Reflect.ownKeys(target);
				},

				get(_, name) {
					if (name === 'isProxy') return true;
					name = name.toString();
					return that.selfData[name];
				},
			},
		);
	}

	private buildAgentToolInfo(node: INode) {
		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		const type = nodeType.description.displayName;
		const params = NodeHelpers.getNodeParameters(
			nodeType.description.properties,
			node.parameters,
			true,
			false,
			node,
			nodeType.description,
		);
		const resourceKey = params?.resource;
		const operationKey = params?.operation;

		const resource =
			nodeType.description.properties
				.find((nodeProperties) => nodeProperties.name === 'resource')
				?.options?.find((option) => 'value' in option && option.value === resourceKey)?.name ??
			null;

		const operation =
			nodeType.description.properties
				.find(
					(nodeProperty) =>
						nodeProperty.name === 'operation' &&
						nodeProperty.displayOptions?.show?.resource?.some((y) => y === resourceKey),
				)
				?.options?.find((y) => 'value' in y && y.value === operationKey)?.name ?? null;

		const hasCredentials = !isObjectEmpty(node.credentials ?? {});

		const hasValidCalendar = nodeType.description.name.includes('googleCalendar')
			? isResourceLocatorValue(node.parameters.calendar) && node.parameters.calendar.value !== ''
			: undefined;

		const aiDefinedFields = Object.entries(node.parameters)
			.map(([key, value]) => [key, isResourceLocatorValue(value) ? value.value : value] as const)
			.filter(([_, value]) => value?.toString().toLowerCase().includes('$fromai'))
			.map(
				([key]) =>
					nodeType.description.properties.find((property) => property.name === key)?.displayName,
			);

		return {
			name: node.name,
			type,
			resource,
			operation,
			hasCredentials,
			hasValidCalendar,
			aiDefinedFields,
		};
	}

	private agentInfo() {
		const agentNode = this.workflow.getNode(this.activeNodeName);
		if (!agentNode || agentNode.type !== AGENT_LANGCHAIN_NODE_TYPE) return undefined;
		const connectedTools = this.workflow
			.getParentNodes(this.activeNodeName, NodeConnectionTypes.AiTool)
			.map((nodeName) => this.workflow.getNode(nodeName))
			.filter((node) => node) as INode[];
		const memoryConnectedToAgent =
			this.workflow.getParentNodes(this.activeNodeName, NodeConnectionTypes.AiMemory).length > 0;
		const allTools = this.workflow.queryNodes((nodeType) => {
			return nodeType.description.name.toLowerCase().includes('tool');
		});

		const unconnectedTools = allTools
			.filter(
				(node) =>
					this.workflow.getChildNodes(node.name, NodeConnectionTypes.AiTool, 1).length === 0,
			)
			.filter((node) => !connectedTools.includes(node));

		return {
			memoryConnectedToAgent,
			tools: [
				...connectedTools.map((node) => ({ connected: true, ...this.buildAgentToolInfo(node) })),
				...unconnectedTools.map((node) => ({ connected: false, ...this.buildAgentToolInfo(node) })),
			],
		};
	}

	/**
	 * Returns a proxy which allows to query parameter data of a given node
	 *
	 * @private
	 * @param {string} nodeName The name of the node to query data from
	 * @param {boolean} [resolveValue=true] If the expression value should get resolved
	 */
	private nodeParameterGetter(nodeName: string, resolveValue = true) {
		const that = this;
		const node = this.workflow.nodes[nodeName];

		// `node` is `undefined` only in expressions in credentials

		return new Proxy(node?.parameters ?? {}, {
			has: () => true,
			ownKeys(target) {
				return Reflect.ownKeys(target);
			},
			getOwnPropertyDescriptor() {
				return {
					enumerable: true,
					configurable: true,
				};
			},
			get(target, name) {
				if (name === 'isProxy') return true;
				if (name === 'toJSON') return () => deepCopy(target);

				name = name.toString();

				let returnValue: NodeParameterValueType;
				if (name[0] === '&') {
					const key = name.slice(1);
					if (!that.siblingParameters.hasOwnProperty(key)) {
						throw new ApplicationError('Could not find sibling parameter on node', {
							extra: { nodeName, parameter: key },
						});
					}
					returnValue = that.siblingParameters[key];
				} else {
					if (!node.parameters.hasOwnProperty(name)) {
						// Parameter does not exist on node
						return undefined;
					}

					returnValue = node.parameters[name];
				}

				// Avoid recursion
				if (returnValue === `={{ $parameter.${name} }}`) return undefined;

				if (isResourceLocatorValue(returnValue)) {
					if (returnValue.__regex && typeof returnValue.value === 'string') {
						const expr = new RegExp(returnValue.__regex);
						const extracted = expr.exec(returnValue.value);
						if (extracted && extracted.length >= 2) {
							returnValue = extracted[1];
						} else {
							return returnValue.value;
						}
					} else {
						returnValue = returnValue.value;
					}
				}

				if (resolveValue && typeof returnValue === 'string' && returnValue.charAt(0) === '=') {
					// The found value is an expression so resolve it
					return that.workflow.expression.getParameterValue(
						returnValue,
						that.runExecutionData,
						that.runIndex,
						that.itemIndex,
						that.activeNodeName,
						that.connectionInputData,
						that.mode,
						that.additionalKeys,
						that.executeData,
						false,
						{},
						that.contextNodeName,
					);
				}

				return returnValue;
			},
		});
	}

	private getNodeExecutionOrPinnedData({
		nodeName,
		branchIndex,
		runIndex,
		shortSyntax = false,
	}: {
		nodeName: string;
		branchIndex?: number;
		runIndex?: number;
		shortSyntax?: boolean;
	}) {
		try {
			return this.getNodeExecutionData(nodeName, shortSyntax, branchIndex, runIndex);
		} catch (e) {
			const pinData = getPinDataIfManualExecution(this.workflow, nodeName, this.mode);
			if (pinData) {
				return pinData;
			}

			throw e;
		}
	}

	/**
	 * Returns the node ExecutionData
	 *
	 * @private
	 * @param {string} nodeName The name of the node query data from
	 * @param {boolean} [shortSyntax=false] If short syntax got used
	 * @param {number} [outputIndex] The index of the output, if not given the first one gets used
	 * @param {number} [runIndex] The index of the run, if not given the current one does get used
	 */
	private getNodeExecutionData(
		nodeName: string,
		shortSyntax = false,
		outputIndex?: number,
		runIndex?: number,
	): INodeExecutionData[] {
		const that = this;

		let executionData: INodeExecutionData[];
		if (!shortSyntax) {
			// Long syntax got used to return data from node in path

			if (that.runExecutionData === null) {
				throw new ExpressionError(
					"The workflow hasn't been executed yet, so you can't reference any output data",
					{
						runIndex: that.runIndex,
						itemIndex: that.itemIndex,
					},
				);
			}

			if (!that.workflow.getNode(nodeName)) {
				throw new ExpressionError("Referenced node doesn't exist", {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
					nodeCause: nodeName,
					descriptionKey: 'nodeNotFound',
				});
			}

			if (
				!that.runExecutionData.resultData.runData.hasOwnProperty(nodeName) &&
				!getPinDataIfManualExecution(that.workflow, nodeName, that.mode)
			) {
				throw new ExpressionError('Referenced node is unexecuted', {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
					type: 'no_node_execution_data',
					descriptionKey: 'noNodeExecutionData',
					nodeCause: nodeName,
				});
			}

			runIndex = runIndex === undefined ? that.defaultReturnRunIndex : runIndex;
			runIndex =
				runIndex === -1 ? that.runExecutionData.resultData.runData[nodeName].length - 1 : runIndex;

			if (that.runExecutionData.resultData.runData[nodeName].length <= runIndex) {
				throw new ExpressionError(`Run ${runIndex} of node "${nodeName}" not found`, {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
				});
			}

			const taskData = that.runExecutionData.resultData.runData[nodeName][runIndex].data!;

			if (!taskData.main?.length || taskData.main[0] === null) {
				// throw new ApplicationError('No data found for item-index', { extra: { itemIndex } });
				throw new ExpressionError('No data found from `main` input', {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
				});
			}

			// Check from which output to read the data.
			// Depends on how the nodes are connected.
			// (example "IF" node. If node is connected to "true" or to "false" output)
			if (outputIndex === undefined) {
				const nodeConnection = that.workflow.getNodeConnectionIndexes(
					that.contextNodeName,
					nodeName,
					NodeConnectionTypes.Main,
				);

				if (nodeConnection === undefined) {
					throw new ExpressionError(`connect "${that.contextNodeName}" to "${nodeName}"`, {
						runIndex: that.runIndex,
						itemIndex: that.itemIndex,
					});
				}
				outputIndex = nodeConnection.sourceIndex;
			}

			if (outputIndex === undefined) {
				outputIndex = 0;
			}

			if (taskData.main.length <= outputIndex) {
				throw new ExpressionError(`Node "${nodeName}" has no branch with index ${outputIndex}.`, {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
				});
			}

			executionData = taskData.main[outputIndex] as INodeExecutionData[];
		} else {
			// Short syntax got used to return data from active node
			executionData = that.connectionInputData;
		}

		return executionData;
	}

	/**
	 * Returns a proxy which allows to query data of a given node
	 *
	 * @private
	 * @param {string} nodeName The name of the node query data from
	 * @param {boolean} [shortSyntax=false] If short syntax got used
	 * @param {boolean} [throwOnMissingExecutionData=true] If an error should get thrown if no execution data is available
	 */
	private nodeDataGetter(
		nodeName: string,
		shortSyntax = false,
		throwOnMissingExecutionData = true,
	) {
		const that = this;
		const node = this.workflow.nodes[nodeName];

		return new Proxy(
			{ binary: undefined, data: undefined, json: undefined },
			{
				has: () => true,
				get(target, name, receiver) {
					if (name === 'isProxy') return true;
					name = name.toString();

					if (!node) {
						throw new ExpressionError("Referenced node doesn't exist", {
							runIndex: that.runIndex,
							itemIndex: that.itemIndex,
							nodeCause: nodeName,
							descriptionKey: 'nodeNotFound',
						});
					}

					if (['binary', 'data', 'json'].includes(name)) {
						const executionData = that.getNodeExecutionOrPinnedData({
							nodeName,
							shortSyntax,
						});

						if (executionData.length === 0 && !throwOnMissingExecutionData) {
							return undefined;
						}

						if (executionData.length === 0) {
							if (that.workflow.getParentNodes(nodeName).length === 0) {
								throw new ExpressionError('No execution data available', {
									messageTemplate:
										'No execution data available to expression under ‘%%PARAMETER%%’',
									descriptionKey: 'noInputConnection',
									nodeCause: nodeName,
									runIndex: that.runIndex,
									itemIndex: that.itemIndex,
									type: 'no_input_connection',
								});
							}

							throw new ExpressionError('No execution data available', {
								runIndex: that.runIndex,
								itemIndex: that.itemIndex,
								type: 'no_execution_data',
							});
						}

						if (executionData.length <= that.itemIndex) {
							throw new ExpressionError(`No data found for item-index: "${that.itemIndex}"`, {
								runIndex: that.runIndex,
								itemIndex: that.itemIndex,
							});
						}

						if (['data', 'json'].includes(name)) {
							// JSON-Data
							return executionData[that.itemIndex].json;
						}
						if (name === 'binary') {
							// Binary-Data
							const returnData: IDataObject = {};

							if (!executionData[that.itemIndex].binary) {
								return returnData;
							}

							const binaryKeyData = executionData[that.itemIndex].binary!;
							for (const keyName of Object.keys(binaryKeyData)) {
								returnData[keyName] = {};

								const binaryData = binaryKeyData[keyName];
								for (const propertyName in binaryData) {
									if (propertyName === 'data') {
										// Skip the data property

										continue;
									}
									(returnData[keyName] as IDataObject)[propertyName] = binaryData[propertyName];
								}
							}

							return returnData;
						}
					} else if (name === 'context') {
						return that.nodeContextGetter(nodeName);
					} else if (name === 'parameter') {
						// Get node parameter data
						return that.nodeParameterGetter(nodeName);
					} else if (name === 'runIndex') {
						if (!that.runExecutionData?.resultData.runData[nodeName]) {
							return -1;
						}
						return that.runExecutionData.resultData.runData[nodeName].length - 1;
					}

					return Reflect.get(target, name, receiver);
				},
			},
		);
	}

	private prevNodeGetter() {
		const allowedValues = ['name', 'outputIndex', 'runIndex'];
		const that = this;

		return new Proxy(
			{},
			{
				has: () => true,
				ownKeys() {
					return allowedValues;
				},
				getOwnPropertyDescriptor() {
					return {
						enumerable: true,
						configurable: true,
					};
				},
				get(target, name, receiver) {
					if (name === 'isProxy') return true;

					if (!that.executeData?.source) {
						// Means the previous node did not get executed yet
						return undefined;
					}

					const sourceData: ISourceData = that.executeData.source.main[0] as ISourceData;

					if (name === 'name') {
						return sourceData.previousNode;
					}
					if (name === 'outputIndex') {
						return sourceData.previousNodeOutput || 0;
					}
					if (name === 'runIndex') {
						return sourceData.previousNodeRun || 0;
					}

					return Reflect.get(target, name, receiver);
				},
			},
		);
	}

	/**
	 * Returns a proxy to query data from the workflow
	 *
	 * @private
	 */
	private workflowGetter() {
		const allowedValues = ['active', 'id', 'name'];
		const that = this;

		return new Proxy(
			{},
			{
				has: () => true,
				ownKeys() {
					return allowedValues;
				},
				getOwnPropertyDescriptor() {
					return {
						enumerable: true,
						configurable: true,
					};
				},
				get(target, name, receiver) {
					if (name === 'isProxy') return true;

					if (allowedValues.includes(name.toString())) {
						const value = that.workflow[name as keyof typeof target];

						if (value === undefined && name === 'id') {
							throw new ExpressionError('save workflow to view', {
								description: 'Please save the workflow first to use $workflow',
								runIndex: that.runIndex,
								itemIndex: that.itemIndex,
							});
						}

						return value;
					}

					return Reflect.get(target, name, receiver);
				},
			},
		);
	}

	/**
	 * Returns a proxy to query data of all nodes
	 *
	 * @private
	 */
	private nodeGetter() {
		const that = this;
		return new Proxy(
			{},
			{
				has: () => true,
				get(_, name) {
					if (name === 'isProxy') return true;

					const nodeName = name.toString();

					if (that.workflow.getNode(nodeName) === null) {
						throw new ExpressionError("Referenced node doesn't exist", {
							runIndex: that.runIndex,
							itemIndex: that.itemIndex,
							nodeCause: nodeName,
							descriptionKey: 'nodeNotFound',
						});
					}

					return that.nodeDataGetter(nodeName);
				},
			},
		);
	}

	/**
	 * Returns the data proxy object which allows to query data from current run
	 *
	 */
	getDataProxy(opts?: { throwOnMissingExecutionData: boolean }): IWorkflowDataProxyData {
		const that = this;

		// replacing proxies with the actual data.
		const jmespathWrapper = (data: IDataObject | IDataObject[], query: string) => {
			if (typeof data !== 'object' || typeof query !== 'string') {
				throw new ExpressionError('expected two arguments (Object, string) for this function', {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
				});
			}

			if (!Array.isArray(data) && typeof data === 'object') {
				return jmespath.search({ ...data }, query);
			}
			return jmespath.search(data, query);
		};

		const createExpressionError = (
			message: string,
			context?: ExpressionErrorOptions & {
				moreInfoLink?: boolean;
				functionOverrides?: {
					// Custom data to display for Function-Nodes
					message?: string;
					description?: string;
				};
			},
		) => {
			if (isScriptingNode(that.activeNodeName, that.workflow) && context?.functionOverrides) {
				// If the node in which the error is thrown is a function node,
				// display a different error message in case there is one defined
				message = context.functionOverrides.message || message;
				context.description = context.functionOverrides.description || context.description;
				// The error will be in the code and not on an expression on a parameter
				// so remove the messageTemplate as it would overwrite the message
				context.messageTemplate = undefined;
			}

			if (context?.nodeCause) {
				const nodeName = context.nodeCause;
				const pinData = getPinDataIfManualExecution(that.workflow, nodeName, that.mode);

				if (pinData) {
					if (!context) {
						context = {};
					}
					message = `Unpin '${nodeName}' to execute`;
					context.messageTemplate = undefined;
					context.descriptionKey = 'pairedItemPinned';
				}

				if (context.moreInfoLink && (pinData || isScriptingNode(nodeName, that.workflow))) {
					const moreInfoLink =
						' <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-errors/">More info</a>';

					context.description += moreInfoLink;
					if (context.descriptionTemplate) context.descriptionTemplate += moreInfoLink;
				}
			}

			return new ExpressionError(message, {
				runIndex: that.runIndex,
				itemIndex: that.itemIndex,
				...context,
			});
		};

		const createInvalidPairedItemError = ({ nodeName }: { nodeName: string }) => {
			return createExpressionError("Can't get data for expression", {
				messageTemplate: 'Expression info invalid',
				functionality: 'pairedItem',
				functionOverrides: {
					message: "Can't get data",
				},
				nodeCause: nodeName,
				descriptionKey: 'pairedItemInvalidInfo',
				type: 'paired_item_invalid_info',
			});
		};

		const createMissingPairedItemError = (
			nodeCause: string,
			usedMethodName: PairedItemMethod = PAIRED_ITEM_METHOD.PAIRED_ITEM,
		) => {
			const pinData = getPinDataIfManualExecution(that.workflow, nodeCause, that.mode);
			const message = pinData
				? `Using the ${usedMethodName} method doesn't work with pinned data in this scenario. Please unpin '${nodeCause}' and try again.`
				: `Paired item data for ${usedMethodName} from node '${nodeCause}' is unavailable. Ensure '${nodeCause}' is providing the required output.`;

			return new ExpressionError(message, {
				runIndex: that.runIndex,
				itemIndex: that.itemIndex,
				functionality: 'pairedItem',
				descriptionKey: isScriptingNode(nodeCause, that.workflow)
					? 'pairedItemNoInfoCodeNode'
					: 'pairedItemNoInfo',
				nodeCause,
				causeDetailed: `Missing pairedItem data (node '${nodeCause}' probably didn't supply it)`,
				type: 'paired_item_no_info',
			});
		};

		const createNoConnectionError = (nodeCause: string) => {
			return createExpressionError('Invalid expression', {
				messageTemplate: 'No path back to referenced node',
				functionality: 'pairedItem',
				descriptionKey: isScriptingNode(nodeCause, that.workflow)
					? 'pairedItemNoConnectionCodeNode'
					: 'pairedItemNoConnection',
				type: 'paired_item_no_connection',
				moreInfoLink: true,
				nodeCause,
			});
		};

		function createBranchNotFoundError(node: string, item: number, cause?: string) {
			return createExpressionError('Branch not found', {
				messageTemplate: 'Paired item references non-existent branch',
				functionality: 'pairedItem',
				nodeCause: cause,
				functionOverrides: { message: 'Invalid branch reference' },
				description: `Item ${item} in node ${node} references a branch that doesn't exist.`,
				type: 'paired_item_invalid_info',
			});
		}

		function createPairedItemNotFound(destNode: string, cause?: string) {
			return createExpressionError('Paired item resolution failed', {
				messageTemplate: 'Unable to find paired item source',
				functionality: 'pairedItem',
				nodeCause: cause,
				functionOverrides: { message: 'Data not found' },
				description: `Could not trace back to node '${destNode}'`,
				type: 'paired_item_no_info',
				moreInfoLink: true,
			});
		}

		function createPairedItemMultipleItemsFound(destNode: string, itemIndex: number) {
			return createExpressionError('Multiple matches found', {
				messageTemplate: `Multiple matching items for item [${itemIndex}]`,
				functionality: 'pairedItem',
				functionOverrides: { message: 'Multiple matches' },
				nodeCause: destNode,
				descriptionKey: isScriptingNode(destNode, that.workflow)
					? 'pairedItemMultipleMatchesCodeNode'
					: 'pairedItemMultipleMatches',
				type: 'paired_item_multiple_matches',
			});
		}

		function normalizeInputs(
			pairedItem: IPairedItemData,
			sourceData: ISourceData | null,
		): [IPairedItemData, ISourceData | null] {
			if (typeof pairedItem === 'number') {
				pairedItem = { item: pairedItem };
			}
			const finalSource = pairedItem.sourceOverwrite || sourceData;
			return [pairedItem, finalSource];
		}

		function pinDataToTask(pinData: INodeExecutionData[] | undefined): ITaskData | undefined {
			if (!pinData) return undefined;
			return {
				data: { main: [pinData] },
				startTime: 0,
				executionTime: 0,
				executionIndex: 0,
				source: [],
			};
		}

		function getTaskData(source: ISourceData): ITaskData | undefined {
			return (
				that.runExecutionData?.resultData?.runData?.[source.previousNode]?.[
					source.previousNodeRun || 0
				] ??
				pinDataToTask(getPinDataIfManualExecution(that.workflow, source.previousNode, that.mode))
			);
		}

		function getNodeOutput(
			taskData: ITaskData | undefined,
			source: ISourceData,
			nodeCause?: string,
		): INodeExecutionData[] {
			const outputIndex = source.previousNodeOutput || 0;
			const outputs = taskData?.data?.main?.[outputIndex];
			if (!outputs) {
				throw createExpressionError('Can’t get data for expression', {
					messageTemplate: 'Missing output data',
					functionOverrides: { message: 'Missing output' },
					nodeCause,
					description: `Expected output #${outputIndex} from node ${source.previousNode}`,
					type: 'internal',
				});
			}
			return outputs;
		}

		const normalizePairedItem = (
			paired: number | IPairedItemData | Array<number | IPairedItemData> | null | undefined,
		): IPairedItemData[] => {
			if (paired === null || paired === undefined) {
				return [];
			}

			const pairedItems = Array.isArray(paired) ? paired : [paired];

			return pairedItems.map((p) => (typeof p === 'number' ? { item: p } : p));
		};

		const getPairedItem = (
			destinationNodeName: string,
			incomingSourceData: ISourceData | null,
			initialPairedItem: IPairedItemData,
			usedMethodName: PairedItemMethod = PAIRED_ITEM_METHOD.$GET_PAIRED_ITEM,
			nodeBeforeLast?: string,
		): INodeExecutionData => {
			// Normalize inputs
			const [pairedItem, sourceData] = normalizeInputs(initialPairedItem, incomingSourceData);

			if (!sourceData) {
				throw createPairedItemNotFound(destinationNodeName, nodeBeforeLast);
			}

			const taskData = getTaskData(sourceData);
			const outputData = getNodeOutput(taskData, sourceData, nodeBeforeLast);
			const item = outputData[pairedItem.item];
			const sourceArray = taskData?.source ?? [];

			// Done: reached the destination node in the ancestry chain
			if (sourceData.previousNode === destinationNodeName) {
				if (pairedItem.item >= outputData.length) {
					throw createInvalidPairedItemError({ nodeName: sourceData.previousNode });
				}

				return item;
			}

			// Normalize paired item to always be IPairedItemData[]
			const nextPairedItems = normalizePairedItem(item.pairedItem);

			if (nextPairedItems.length === 0) {
				throw createMissingPairedItemError(sourceData.previousNode, usedMethodName);
			}

			// Recursively traverse ancestry to find the destination node + paired item
			const results = nextPairedItems.flatMap((nextPairedItem) => {
				const inputIndex = nextPairedItem.input ?? 0;

				if (inputIndex >= sourceArray.length) return [];

				const nextSource = nextPairedItem.sourceOverwrite ?? sourceArray[inputIndex];

				try {
					return createResultOk(
						getPairedItem(
							destinationNodeName,
							nextSource,
							{ ...nextPairedItem, input: inputIndex },
							usedMethodName,
							sourceData.previousNode,
						),
					);
				} catch (error) {
					return createResultError(error);
				}
			});

			if (results.every((result) => !result.ok)) {
				throw results[0].error;
			}

			const matchedItems = results.filter((result) => result.ok).map((result) => result.result);

			if (matchedItems.length === 0) {
				if (sourceArray.length === 0) throw createNoConnectionError(destinationNodeName);
				throw createBranchNotFoundError(sourceData.previousNode, pairedItem.item, nodeBeforeLast);
			}

			const [first, ...rest] = matchedItems;
			if (rest.some((r) => r !== first)) {
				throw createPairedItemMultipleItemsFound(destinationNodeName, pairedItem.item);
			}

			return first;
		};

		const handleFromAi = (
			name: string,
			_description?: string,
			_type: string = 'string',
			defaultValue?: unknown,
		) => {
			const { itemIndex, runIndex } = that;
			if (!name || name === '') {
				throw new ExpressionError("Add a key, e.g. $fromAI('placeholder_name')", {
					runIndex,
					itemIndex,
				});
			}
			const nameValidationRegex = /^[a-zA-Z0-9_-]{0,64}$/;
			if (!nameValidationRegex.test(name)) {
				throw new ExpressionError(
					'Invalid parameter key, must be between 1 and 64 characters long and only contain lowercase letters, uppercase letters, numbers, underscores, and hyphens',
					{
						runIndex,
						itemIndex,
					},
				);
			}
			const inputData =
				that.runExecutionData?.resultData.runData[that.activeNodeName]?.[runIndex].inputOverride;
			const placeholdersDataInputData =
				inputData?.[NodeConnectionTypes.AiTool]?.[0]?.[itemIndex].json;

			if (!placeholdersDataInputData) {
				throw new ExpressionError('No execution data available', {
					runIndex,
					itemIndex,
					type: 'no_execution_data',
				});
			}
			return (
				// TS does not know that the key exists, we need to address this in refactor
				(placeholdersDataInputData?.query as Record<string, unknown>)?.[name] ??
				placeholdersDataInputData?.[name] ??
				defaultValue
			);
		};

		const base = {
			$: (nodeName: string) => {
				if (!nodeName) {
					throw createExpressionError('When calling $(), please specify a node');
				}

				const referencedNode = that.workflow.getNode(nodeName);
				if (referencedNode === null) {
					throw createExpressionError("Referenced node doesn't exist", {
						runIndex: that.runIndex,
						itemIndex: that.itemIndex,
						nodeCause: nodeName,
						descriptionKey: 'nodeNotFound',
					});
				}

				const ensureNodeExecutionData = () => {
					if (
						!that?.runExecutionData?.resultData?.runData.hasOwnProperty(nodeName) &&
						!getPinDataIfManualExecution(that.workflow, nodeName, that.mode)
					) {
						throw createExpressionError('Referenced node is unexecuted', {
							runIndex: that.runIndex,
							itemIndex: that.itemIndex,
							type: 'no_node_execution_data',
							descriptionKey: 'noNodeExecutionData',
							nodeCause: nodeName,
						});
					}
				};

				return new Proxy(
					{},
					{
						has: () => true,
						ownKeys() {
							return [
								PAIRED_ITEM_METHOD.PAIRED_ITEM,
								'isExecuted',
								PAIRED_ITEM_METHOD.ITEM_MATCHING,
								PAIRED_ITEM_METHOD.ITEM,
								'first',
								'last',
								'all',
								'context',
								'params',
							];
						},
						get(target, property, receiver) {
							if (property === 'isProxy') return true;

							if (property === 'isExecuted') {
								return (
									that?.runExecutionData?.resultData?.runData.hasOwnProperty(nodeName) ?? false
								);
							}

							if (
								property === PAIRED_ITEM_METHOD.PAIRED_ITEM ||
								property === PAIRED_ITEM_METHOD.ITEM_MATCHING ||
								property === PAIRED_ITEM_METHOD.ITEM
							) {
								// Before resolving the pairedItem make sure that the requested node comes in the
								// graph before the current one
								const activeNode = that.workflow.getNode(that.activeNodeName);

								let contextNode = that.contextNodeName;
								if (activeNode) {
									const parentMainInputNode = that.workflow.getParentMainInputNode(activeNode);
									contextNode = parentMainInputNode.name ?? contextNode;
								}
								const parentNodes = that.workflow.getParentNodes(contextNode);
								if (!parentNodes.includes(nodeName)) {
									throw createNoConnectionError(nodeName);
								}

								ensureNodeExecutionData();

								const pairedItemMethod = (itemIndex?: number) => {
									if (itemIndex === undefined) {
										if (property === PAIRED_ITEM_METHOD.ITEM_MATCHING) {
											throw createExpressionError('Missing item index for .itemMatching()', {
												itemIndex,
											});
										}
										itemIndex = that.itemIndex;
									}

									if (!that.connectionInputData.length) {
										const pinnedData = getPinDataIfManualExecution(
											that.workflow,
											nodeName,
											that.mode,
										);

										if (pinnedData) {
											return pinnedData[itemIndex];
										}
									}

									const executionData = that.connectionInputData;
									const input = executionData?.[itemIndex];
									if (!input) {
										throw createExpressionError('Can’t get data for expression', {
											messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
											functionality: 'pairedItem',
											functionOverrides: {
												description: `Some intermediate nodes between ‘<strong>${nodeName}</strong>‘ and  ‘<strong>${that.activeNodeName}</strong>‘ have not executed yet.`,
												message: 'Can’t get data',
											},
											description: `Some intermediate nodes between ‘<strong>${nodeName}</strong>‘ and  ‘<strong>${that.activeNodeName}</strong>‘ have not executed yet.`,
											causeDetailed: `pairedItem can\'t be found when intermediate nodes between ‘<strong>${nodeName}</strong>‘ and  ‘<strong>${that.activeNodeName}</strong> have not executed yet.`,
											itemIndex,
											type: 'paired_item_intermediate_nodes',
										});
									}

									// As we operate on the incoming item we can be sure that pairedItem is not an
									// array. After all can it only come from exactly one previous node via a certain
									// input. For that reason do we not have to consider the array case.
									const pairedItem = input.pairedItem as IPairedItemData;

									if (pairedItem === undefined) {
										throw createMissingPairedItemError(that.activeNodeName, property);
									}

									if (!that.executeData?.source) {
										throw createExpressionError('Can’t get data for expression', {
											messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
											functionality: 'pairedItem',
											functionOverrides: {
												message: 'Can’t get data',
											},
											description:
												'Apologies, this is an internal error. See details for more information',
											causeDetailed: 'Missing sourceData (probably an internal error)',
											itemIndex,
										});
									}

									const sourceData: ISourceData | null =
										that.executeData.source.main[pairedItem.input || 0] ??
										that.executeData.source.main[0];

									return getPairedItem(nodeName, sourceData, pairedItem, property);
								};

								if (property === PAIRED_ITEM_METHOD.ITEM) {
									return pairedItemMethod();
								}
								return pairedItemMethod;
							}

							if (property === 'first') {
								ensureNodeExecutionData();
								return (branchIndex?: number, runIndex?: number) => {
									branchIndex =
										branchIndex ??
										// default to the output the active node is connected to
										that.workflow.getNodeConnectionIndexes(that.activeNodeName, nodeName)
											?.sourceIndex ??
										0;
									const executionData = that.getNodeExecutionOrPinnedData({
										nodeName,
										branchIndex,
										runIndex,
									});
									if (executionData[0]) return executionData[0];
									return undefined;
								};
							}
							if (property === 'last') {
								ensureNodeExecutionData();
								return (branchIndex?: number, runIndex?: number) => {
									branchIndex =
										branchIndex ??
										// default to the output the active node is connected to
										that.workflow.getNodeConnectionIndexes(that.activeNodeName, nodeName)
											?.sourceIndex ??
										0;
									const executionData = that.getNodeExecutionOrPinnedData({
										nodeName,
										branchIndex,
										runIndex,
									});
									if (!executionData.length) return undefined;
									if (executionData[executionData.length - 1]) {
										return executionData[executionData.length - 1];
									}
									return undefined;
								};
							}
							if (property === 'all') {
								ensureNodeExecutionData();
								return (branchIndex?: number, runIndex?: number) => {
									branchIndex =
										branchIndex ??
										// default to the output the active node is connected to
										that.workflow.getNodeConnectionIndexes(that.activeNodeName, nodeName)
											?.sourceIndex ??
										0;
									return that.getNodeExecutionOrPinnedData({ nodeName, branchIndex, runIndex });
								};
							}
							if (property === 'context') {
								return that.nodeContextGetter(nodeName);
							}
							if (property === 'params') {
								return that.workflow.getNode(nodeName)?.parameters;
							}
							return Reflect.get(target, property, receiver);
						},
					},
				);
			},

			$input: new Proxy({} as ProxyInput, {
				has: () => true,
				ownKeys() {
					return ['all', 'context', 'first', 'item', 'last', 'params'];
				},
				getOwnPropertyDescriptor() {
					return {
						enumerable: true,
						configurable: true,
					};
				},
				get(target, property, receiver) {
					if (property === 'isProxy') return true;

					if (that.connectionInputData.length === 0) {
						throw createExpressionError('No execution data available', {
							runIndex: that.runIndex,
							itemIndex: that.itemIndex,
							type: 'no_execution_data',
						});
					}

					if (property === 'item') {
						return that.connectionInputData[that.itemIndex];
					}
					if (property === 'first') {
						return (...args: unknown[]) => {
							if (args.length) {
								throw createExpressionError('$input.first() should have no arguments');
							}

							const result = that.connectionInputData;
							if (result[0]) {
								return result[0];
							}
							return undefined;
						};
					}
					if (property === 'last') {
						return (...args: unknown[]) => {
							if (args.length) {
								throw createExpressionError('$input.last() should have no arguments');
							}

							const result = that.connectionInputData;
							if (result.length && result[result.length - 1]) {
								return result[result.length - 1];
							}
							return undefined;
						};
					}
					if (property === 'all') {
						return () => {
							const result = that.connectionInputData;
							if (result.length) {
								return result;
							}
							return [];
						};
					}

					if (['context', 'params'].includes(property as string)) {
						// For the following properties we need the source data so fail in case it is missing
						// for some reason (even though that should actually never happen)
						if (!that.executeData?.source) {
							throw createExpressionError('Can’t get data for expression', {
								messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
								functionOverrides: {
									message: 'Can’t get data',
								},
								description:
									'Apologies, this is an internal error. See details for more information',
								causeDetailed: 'Missing sourceData (probably an internal error)',
								runIndex: that.runIndex,
							});
						}

						const sourceData: ISourceData = that.executeData.source.main[0] as ISourceData;

						if (property === 'context') {
							return that.nodeContextGetter(sourceData.previousNode);
						}
						if (property === 'params') {
							return that.workflow.getNode(sourceData.previousNode)?.parameters;
						}
					}

					return Reflect.get(target, property, receiver);
				},
			}),

			$binary: {}, // Placeholder
			$data: {}, // Placeholder
			$env: createEnvProvider(
				that.runIndex,
				that.itemIndex,
				that.envProviderState ?? createEnvProviderState(),
			),
			$evaluateExpression: (expression: string, itemIndex?: number) => {
				itemIndex = itemIndex || that.itemIndex;
				return that.workflow.expression.getParameterValue(
					`=${expression}`,
					that.runExecutionData,
					that.runIndex,
					itemIndex,
					that.activeNodeName,
					that.connectionInputData,
					that.mode,
					that.additionalKeys,
					that.executeData,
					false,
					{},
					that.contextNodeName,
				);
			},
			$item: (itemIndex: number, runIndex?: number) => {
				const defaultReturnRunIndex = runIndex === undefined ? -1 : runIndex;
				const dataProxy = new WorkflowDataProxy(
					this.workflow,
					this.runExecutionData,
					this.runIndex,
					itemIndex,
					this.activeNodeName,
					this.connectionInputData,
					that.siblingParameters,
					that.mode,
					that.additionalKeys,
					that.executeData,
					defaultReturnRunIndex,
					{},
					that.contextNodeName,
				);
				return dataProxy.getDataProxy();
			},
			$fromAI: handleFromAi,
			// Make sure mis-capitalized $fromAI is handled correctly even though we don't auto-complete it
			$fromai: handleFromAi,
			$fromAi: handleFromAi,
			$items: (nodeName?: string, outputIndex?: number, runIndex?: number) => {
				if (nodeName === undefined) {
					nodeName = (that.prevNodeGetter() as { name: string }).name;
					const node = this.workflow.nodes[nodeName];
					let result = that.connectionInputData;
					if (node.executeOnce === true) {
						result = result.slice(0, 1);
					}
					if (result.length) {
						return result;
					}
					return [];
				}

				outputIndex = outputIndex || 0;
				runIndex = runIndex === undefined ? -1 : runIndex;

				return that.getNodeExecutionData(nodeName, false, outputIndex, runIndex);
			},
			$json: {}, // Placeholder
			$node: this.nodeGetter(),
			$self: this.selfGetter(),
			$parameter: this.nodeParameterGetter(this.activeNodeName),
			$rawParameter: this.nodeParameterGetter(this.activeNodeName, false),
			$prevNode: this.prevNodeGetter(),
			$runIndex: this.runIndex,
			$mode: this.mode,
			$workflow: this.workflowGetter(),
			$itemIndex: this.itemIndex,
			$now: DateTime.now(),
			$today: DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }),
			$jmesPath: jmespathWrapper,

			DateTime,

			Interval,

			Duration,
			...that.additionalKeys,
			$getPairedItem: getPairedItem,

			// deprecated
			$jmespath: jmespathWrapper,
			$position: this.itemIndex,
			$thisItem: that.connectionInputData[that.itemIndex],
			$thisItemIndex: this.itemIndex,
			$thisRunIndex: this.runIndex,
			$nodeVersion: that.workflow.getNode(that.activeNodeName)?.typeVersion,
			$nodeId: that.workflow.getNode(that.activeNodeName)?.id,
			$agentInfo: this.agentInfo(),
			$webhookId: that.workflow.getNode(that.activeNodeName)?.webhookId,
		};
		const throwOnMissingExecutionData = opts?.throwOnMissingExecutionData ?? true;

		return new Proxy(base, {
			has: () => true,
			get(target, name, receiver) {
				if (name === 'isProxy') return true;

				if (['$data', '$json'].includes(name as string)) {
					return that.nodeDataGetter(that.contextNodeName, true, throwOnMissingExecutionData)?.json;
				}
				if (name === '$binary') {
					return that.nodeDataGetter(that.contextNodeName, true, throwOnMissingExecutionData)
						?.binary;
				}

				return Reflect.get(target, name, receiver);
			},
		});
	}
}
