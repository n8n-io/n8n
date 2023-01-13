/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { DateTime, Duration, Interval, Settings } from 'luxon';
import * as jmespath from 'jmespath';

import {
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
	INodeParameterResourceLocator,
	NodeParameterValueType,
	WorkflowExecuteMode,
} from './Interfaces';
import * as NodeHelpers from './NodeHelpers';
import { ExpressionError } from './ExpressionError';
import type { Workflow } from './Workflow';
import { deepCopy } from './utils';

export function isResourceLocatorValue(value: unknown): value is INodeParameterResourceLocator {
	return Boolean(
		typeof value === 'object' && value && 'mode' in value && 'value' in value && '__rl' in value,
	);
}

const SCRIPTING_NODE_TYPES = [
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.code',
];

const isScriptingNode = (nodeName: string, workflow: Workflow) => {
	const node = workflow.getNode(nodeName);

	return node && SCRIPTING_NODE_TYPES.includes(node.type);
};

export class WorkflowDataProxy {
	private workflow: Workflow;

	private runExecutionData: IRunExecutionData | null;

	private defaultReturnRunIndex: number;

	private runIndex: number;

	private itemIndex: number;

	private activeNodeName: string;

	private connectionInputData: INodeExecutionData[];

	private siblingParameters: INodeParameters;

	private mode: WorkflowExecuteMode;

	private selfData: IDataObject;

	private additionalKeys: IWorkflowDataProxyAdditionalKeys;

	private executeData: IExecuteData | undefined;

	private defaultTimezone: string;

	private timezone: string;

	constructor(
		workflow: Workflow,
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		siblingParameters: INodeParameters,
		mode: WorkflowExecuteMode,
		defaultTimezone: string,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		defaultReturnRunIndex = -1,
		selfData = {},
	) {
		this.activeNodeName = activeNodeName;
		this.workflow = workflow;

		this.runExecutionData = isScriptingNode(activeNodeName, workflow)
			? deepCopy(runExecutionData)
			: runExecutionData;

		this.connectionInputData = isScriptingNode(activeNodeName, workflow)
			? deepCopy(connectionInputData)
			: connectionInputData;

		this.defaultReturnRunIndex = defaultReturnRunIndex;
		this.runIndex = runIndex;
		this.itemIndex = itemIndex;
		this.siblingParameters = siblingParameters;
		this.mode = mode;
		this.defaultTimezone = defaultTimezone;
		this.timezone = (this.workflow.settings.timezone as string) || this.defaultTimezone;
		this.selfData = selfData;
		this.additionalKeys = additionalKeys;
		this.executeData = executeData;
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

		if (!that.runExecutionData?.executionData && that.connectionInputData.length > 1) {
			return {}; // incoming connection has pinned data, so stub context object
		}

		if (!that.runExecutionData?.executionData && !that.runExecutionData?.resultData) {
			throw new ExpressionError(
				"The workflow hasn't been executed yet, so you can't reference any context data",
				{
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
				},
			);
		}

		return new Proxy(
			{},
			{
				ownKeys(target) {
					if (Reflect.ownKeys(target).length === 0) {
						// Target object did not get set yet
						Object.assign(target, NodeHelpers.getContext(that.runExecutionData!, 'node', node));
					}

					return Reflect.ownKeys(target);
				},
				getOwnPropertyDescriptor(k) {
					return {
						enumerable: true,
						configurable: true,
					};
				},
				get(target, name, receiver) {
					// eslint-disable-next-line no-param-reassign
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
				ownKeys(target) {
					return Reflect.ownKeys(target);
				},
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				get(target, name, receiver) {
					name = name.toString();
					return that.selfData[name];
				},
			},
		);
	}

	/**
	 * Returns a proxy which allows to query parameter data of a given node
	 *
	 * @private
	 * @param {string} nodeName The name of the node to query data from
	 */
	private nodeParameterGetter(nodeName: string) {
		const that = this;
		const node = this.workflow.nodes[nodeName];

		return new Proxy(node.parameters, {
			ownKeys(target) {
				return Reflect.ownKeys(target);
			},
			getOwnPropertyDescriptor(k) {
				return {
					enumerable: true,
					configurable: true,
				};
			},
			get(target, name, receiver) {
				name = name.toString();

				let returnValue: NodeParameterValueType;
				if (name[0] === '&') {
					const key = name.slice(1);
					if (!that.siblingParameters.hasOwnProperty(key)) {
						throw new Error(`Could not find sibling parameter "${key}" on node "${nodeName}"`);
					}
					returnValue = that.siblingParameters[key];
				} else {
					if (!node.parameters.hasOwnProperty(name)) {
						// Parameter does not exist on node
						return undefined;
					}

					returnValue = node.parameters[name];
				}

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

				if (typeof returnValue === 'string' && returnValue.charAt(0) === '=') {
					// The found value is an expression so resolve it
					return that.workflow.expression.getParameterValue(
						returnValue,
						that.runExecutionData,
						that.runIndex,
						that.itemIndex,
						that.activeNodeName,
						that.connectionInputData,
						that.mode,
						that.timezone,
						that.additionalKeys,
						that.executeData,
					);
				}

				return returnValue;
			},
		});
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

			if (!that.runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
				if (that.workflow.getNode(nodeName)) {
					throw new ExpressionError(`no data, execute "${nodeName}" node first`, {
						runIndex: that.runIndex,
						itemIndex: that.itemIndex,
					});
				}
				throw new ExpressionError(`"${nodeName}" node doesn't exist`, {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
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

			if (taskData.main === null || !taskData.main.length || taskData.main[0] === null) {
				// throw new Error(`No data found for item-index: "${itemIndex}"`);
				throw new ExpressionError('No data found from "main" input.', {
					runIndex: that.runIndex,
					itemIndex: that.itemIndex,
				});
			}

			// Check from which output to read the data.
			// Depends on how the nodes are connected.
			// (example "IF" node. If node is connected to "true" or to "false" output)
			if (outputIndex === undefined) {
				const nodeConnection = that.workflow.getNodeConnectionIndexes(
					that.activeNodeName,
					nodeName,
					'main',
				);

				if (nodeConnection === undefined) {
					throw new ExpressionError(`connect "${that.activeNodeName}" to "${nodeName}"`, {
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

			// TODO: Here have to generate connection Input data for the current node by itself
			// Data needed:
			// #- the run-index
			// - node which did send data (has to be the one from last recent execution)
			// - later also the name of the input and its index (currently not needed as it is always "main" and index "0")
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
	 */
	private nodeDataGetter(nodeName: string, shortSyntax = false) {
		const that = this;
		const node = this.workflow.nodes[nodeName];

		return new Proxy(
			{ binary: undefined, data: undefined, json: undefined },
			{
				get(target, name, receiver) {
					name = name.toString();

					if (!node) {
						throw new ExpressionError(`"${nodeName}" node doesn't exist`);
					}

					if (['binary', 'data', 'json'].includes(name)) {
						const executionData = that.getNodeExecutionData(nodeName, shortSyntax, undefined);
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
										// eslint-disable-next-line no-continue
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
						if (
							that.runExecutionData === null ||
							!that.runExecutionData.resultData.runData[nodeName]
						) {
							return -1;
						}
						return that.runExecutionData.resultData.runData[nodeName].length - 1;
					}

					return Reflect.get(target, name, receiver);
				},
			},
		);
	}

	/**
	 * Returns a proxy to query data from the environment
	 *
	 * @private
	 */
	private envGetter() {
		const that = this;
		return new Proxy(
			{},
			{
				get(target, name, receiver) {
					if (
						typeof process === 'undefined' || // env vars are inaccessible to frontend
						process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE === 'true'
					) {
						throw new ExpressionError('access to env vars denied', {
							causeDetailed:
								'If you need access please contact the administrator to remove the environment variable ‘N8N_BLOCK_ENV_ACCESS_IN_NODE‘',
							runIndex: that.runIndex,
							itemIndex: that.itemIndex,
							failExecution: true,
						});
					}
					return process.env[name.toString()];
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
				ownKeys(target) {
					return allowedValues;
				},
				getOwnPropertyDescriptor(k) {
					return {
						enumerable: true,
						configurable: true,
					};
				},
				get(target, name, receiver) {
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
				ownKeys(target) {
					return allowedValues;
				},
				getOwnPropertyDescriptor(k) {
					return {
						enumerable: true,
						configurable: true,
					};
				},
				get(target, name, receiver) {
					if (allowedValues.includes(name.toString())) {
						const value = that.workflow[name as keyof typeof target];

						if (value === undefined && name === 'id') {
							throw new ExpressionError('save workflow to view', {
								description: 'Please save the workflow first to use $workflow',
								runIndex: that.runIndex,
								itemIndex: that.itemIndex,
								failExecution: true,
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
				get(target, name, receiver) {
					const nodeName = name.toString();

					if (that.workflow.getNode(nodeName) === null) {
						throw new ExpressionError(`"${nodeName}" node doesn't exist`, {
							runIndex: that.runIndex,
							itemIndex: that.itemIndex,
							failExecution: true,
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
	getDataProxy(): IWorkflowDataProxyData {
		const that = this;

		const getNodeOutput = (nodeName?: string, branchIndex?: number, runIndex?: number) => {
			let executionData: INodeExecutionData[];

			if (nodeName === undefined) {
				executionData = that.connectionInputData;
			} else {
				branchIndex = branchIndex || 0;
				runIndex = runIndex === undefined ? -1 : runIndex;
				executionData = that.getNodeExecutionData(nodeName, false, branchIndex, runIndex);
			}

			return executionData;
		};

		// replacing proxies with the actual data.
		const jmespathWrapper = (data: IDataObject | IDataObject[], query: string) => {
			if (!Array.isArray(data) && typeof data === 'object') {
				return jmespath.search({ ...data }, query);
			}
			return jmespath.search(data, query);
		};

		const createExpressionError = (
			message: string,
			context?: {
				causeDetailed?: string;
				description?: string;
				descriptionTemplate?: string;
				functionality?: 'pairedItem';
				functionOverrides?: {
					// Custom data to display for Function-Nodes
					message?: string;
					description?: string;
				};
				itemIndex?: number;
				messageTemplate?: string;
				moreInfoLink?: boolean;
				nodeCause?: string;
				runIndex?: number;
				type?: string;
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
				const pinData = this.workflow.getPinDataOfNode(nodeName);

				if (pinData) {
					if (!context) {
						context = {};
					}
					message = `‘Node ${nodeName}‘ must be unpinned to execute`;
					context.messageTemplate = undefined;
					context.description = `To fetch the data for the expression, you must unpin the node <strong>'${nodeName}'</strong> and execute the workflow again.`;
					context.descriptionTemplate = `To fetch the data for the expression under '%%PARAMETER%%', you must unpin the node <strong>'${nodeName}'</strong> and execute the workflow again.`;
				}

				if (context.moreInfoLink && (pinData || isScriptingNode(nodeName, that.workflow))) {
					const moreInfoLink =
						' <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-errors/">More info</a>';

					context.description += moreInfoLink;
					context.descriptionTemplate += moreInfoLink;
				}
			}

			return new ExpressionError(message, {
				runIndex: that.runIndex,
				itemIndex: that.itemIndex,
				failExecution: true,
				...context,
			});
		};

		const getPairedItem = (
			destinationNodeName: string,
			incomingSourceData: ISourceData | null,
			pairedItem: IPairedItemData,
		): INodeExecutionData | null => {
			let taskData: ITaskData;

			let sourceData: ISourceData | null = incomingSourceData;

			if (pairedItem.sourceOverwrite) {
				sourceData = pairedItem.sourceOverwrite;
			}

			if (typeof pairedItem === 'number') {
				pairedItem = {
					item: pairedItem,
				};
			}

			const previousNodeHasPinData =
				sourceData && this.workflow.getPinDataOfNode(sourceData.previousNode) !== undefined;

			let currentPairedItem = pairedItem;

			let nodeBeforeLast: string | undefined;

			while (
				!previousNodeHasPinData &&
				sourceData !== null &&
				destinationNodeName !== sourceData.previousNode
			) {
				taskData =
					that.runExecutionData!.resultData.runData[sourceData.previousNode][
						sourceData?.previousNodeRun || 0
					];

				const previousNodeOutput = sourceData.previousNodeOutput || 0;
				if (previousNodeOutput >= taskData.data!.main.length) {
					throw createExpressionError('Can’t get data for expression', {
						messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
						functionOverrides: {
							message: 'Can’t get data',
						},
						nodeCause: nodeBeforeLast,
						description: 'Apologies, this is an internal error. See details for more information',
						causeDetailed: 'Referencing a non-existent output on a node, problem with source data',
						type: 'internal',
					});
				}

				if (pairedItem.item >= taskData.data!.main[previousNodeOutput]!.length) {
					throw createExpressionError('Can’t get data for expression', {
						messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
						functionality: 'pairedItem',
						functionOverrides: {
							message: 'Can’t get data',
						},
						nodeCause: nodeBeforeLast,
						description: `In node ‘<strong>${nodeBeforeLast!}</strong>’, output item ${
							currentPairedItem.item || 0
						} ${
							sourceData.previousNodeRun
								? `of run ${(sourceData.previousNodeRun || 0).toString()} `
								: ''
						}points to an input item on node ‘<strong>${
							sourceData.previousNode
						}</strong>‘ that doesn’t exist.`,
						type: 'invalid pairing info',
						moreInfoLink: true,
					});
				}

				const itemPreviousNode: INodeExecutionData =
					taskData.data!.main[previousNodeOutput]![pairedItem.item];

				if (itemPreviousNode.pairedItem === undefined) {
					throw createExpressionError('Can’t get data for expression', {
						messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
						functionality: 'pairedItem',
						functionOverrides: {
							message: 'Can’t get data',
						},
						nodeCause: sourceData.previousNode,
						description: `To fetch the data from other nodes that this expression needs, more information is needed from the node ‘<strong>${sourceData.previousNode}</strong>’`,
						causeDetailed: `Missing pairedItem data (node ‘${sourceData.previousNode}’ probably didn’t supply it)`,
						type: 'no pairing info',
						moreInfoLink: true,
					});
				}

				if (Array.isArray(itemPreviousNode.pairedItem)) {
					// Item is based on multiple items so check all of them
					const results = itemPreviousNode.pairedItem
						// eslint-disable-next-line @typescript-eslint/no-loop-func
						.map((item) => {
							try {
								const itemInput = item.input || 0;
								if (itemInput >= taskData.source.length) {
									// `Could not resolve pairedItem as the defined node input '${itemInput}' does not exist on node '${sourceData!.previousNode}'.`
									// Actual error does not matter as it gets caught below and `null` will be returned
									throw new Error('Not found');
								}

								return getPairedItem(destinationNodeName, taskData.source[itemInput], item);
							} catch (error) {
								// Means pairedItem could not be found
								return null;
							}
						})
						.filter((result) => result !== null);

					if (results.length !== 1) {
						throw createExpressionError('Invalid expression', {
							messageTemplate: 'Invalid expression under ‘%%PARAMETER%%’',
							functionality: 'pairedItem',
							functionOverrides: {
								description: `The code uses data in the node ‘<strong>${destinationNodeName}</strong>’ but there is more than one matching item in that node`,
								message: 'Invalid code',
							},
							description: `The expression uses data in the node ‘<strong>${destinationNodeName}</strong>’ but there is more than one matching item in that node`,
							type: 'multiple matches',
						});
					}

					return results[0];
				}

				currentPairedItem = pairedItem;

				// pairedItem is not an array
				if (typeof itemPreviousNode.pairedItem === 'number') {
					pairedItem = {
						item: itemPreviousNode.pairedItem,
					};
				} else {
					pairedItem = itemPreviousNode.pairedItem;
				}

				const itemInput = pairedItem.input || 0;
				if (itemInput >= taskData.source.length) {
					if (taskData.source.length === 0) {
						// A trigger node got reached, so looks like that that item can not be resolved
						throw createExpressionError('Invalid expression', {
							messageTemplate: 'Invalid expression under ‘%%PARAMETER%%’',
							functionality: 'pairedItem',
							functionOverrides: {
								description: `The code uses data in the node ‘<strong>${destinationNodeName}</strong>’ but there is no path back to it. Please check this node is connected to it (there can be other nodes in between).`,
								message: 'Invalid code',
							},
							description: `The expression uses data in the node ‘<strong>${destinationNodeName}</strong>’ but there is no path back to it. Please check this node is connected to it (there can be other nodes in between).`,
							type: 'no connection',
							moreInfoLink: true,
						});
					}
					throw createExpressionError('Can’t get data for expression', {
						messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
						functionality: 'pairedItem',
						functionOverrides: {
							message: 'Can’t get data',
						},
						nodeCause: nodeBeforeLast,
						description: `In node ‘<strong>${sourceData.previousNode}</strong>’, output item ${
							currentPairedItem.item || 0
						} of ${
							sourceData.previousNodeRun
								? `of run ${(sourceData.previousNodeRun || 0).toString()} `
								: ''
						}points to a branch that doesn’t exist.`,
						type: 'invalid pairing info',
					});
				}

				nodeBeforeLast = sourceData.previousNode;
				sourceData = taskData.source[pairedItem.input || 0] || null;

				if (pairedItem.sourceOverwrite) {
					sourceData = pairedItem.sourceOverwrite;
				}
			}

			if (sourceData === null) {
				throw createExpressionError('Can’t get data for expression', {
					messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
					functionality: 'pairedItem',
					functionOverrides: {
						message: 'Can’t get data',
					},
					nodeCause: nodeBeforeLast,
					description: 'Could not resolve, proably no pairedItem exists',
					type: 'no pairing info',
					moreInfoLink: true,
				});
			}

			taskData =
				that.runExecutionData!.resultData.runData[sourceData.previousNode][
					sourceData?.previousNodeRun || 0
				];

			const previousNodeOutput = sourceData.previousNodeOutput || 0;
			if (previousNodeOutput >= taskData.data!.main.length) {
				throw createExpressionError('Can’t get data for expression', {
					messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
					functionality: 'pairedItem',
					functionOverrides: {
						message: 'Can’t get data',
					},
					description: 'Item points to a node output which does not exist',
					causeDetailed: `The sourceData points to a node output ‘${previousNodeOutput}‘ which does not exist on node ‘${sourceData.previousNode}‘ (output node did probably supply a wrong one)`,
					type: 'invalid pairing info',
				});
			}

			if (pairedItem.item >= taskData.data!.main[previousNodeOutput]!.length) {
				throw createExpressionError('Can’t get data for expression', {
					messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
					functionality: 'pairedItem',
					functionOverrides: {
						message: 'Can’t get data',
					},
					nodeCause: nodeBeforeLast,
					description: `In node ‘<strong>${nodeBeforeLast!}</strong>’, output item ${
						currentPairedItem.item || 0
					} ${
						sourceData.previousNodeRun
							? `of run ${(sourceData.previousNodeRun || 0).toString()} `
							: ''
					}points to an input item on node ‘<strong>${
						sourceData.previousNode
					}</strong>‘ that doesn’t exist.`,
					type: 'invalid pairing info',
					moreInfoLink: true,
				});
			}

			return taskData.data!.main[previousNodeOutput]![pairedItem.item];
		};

		const base = {
			$: (nodeName: string) => {
				if (!nodeName) {
					throw createExpressionError('When calling $(), please specify a node');
				}

				const referencedNode = that.workflow.getNode(nodeName);
				if (referencedNode === null) {
					throw createExpressionError(`"${nodeName}" node doesn't exist`);
				}

				return new Proxy(
					{},
					{
						ownKeys(target) {
							return [
								'pairedItem',
								'itemMatching',
								'item',
								'first',
								'last',
								'all',
								'context',
								'params',
							];
						},
						get(target, property, receiver) {
							if (['pairedItem', 'itemMatching', 'item'].includes(property as string)) {
								const pairedItemMethod = (itemIndex?: number) => {
									if (itemIndex === undefined) {
										if (property === 'itemMatching') {
											throw createExpressionError('Missing item index for .itemMatching()', {
												itemIndex,
											});
										}
										itemIndex = that.itemIndex;
									}

									const executionData = that.connectionInputData;

									// As we operate on the incoming item we can be sure that pairedItem is not an
									// array. After all can it only come from exactly one previous node via a certain
									// input. For that reason do we not have to consider the array case.
									const pairedItem = executionData[itemIndex].pairedItem as IPairedItemData;

									if (pairedItem === undefined) {
										throw createExpressionError('Can’t get data for expression', {
											messageTemplate: 'Can’t get data for expression under ‘%%PARAMETER%%’ field',
											functionality: 'pairedItem',
											functionOverrides: {
												description: `To fetch the data from other nodes that this code needs, more information is needed from the node ‘<strong>${that.activeNodeName}</strong>‘`,
												message: 'Can’t get data',
											},
											description: `To fetch the data from other nodes that this expression needs, more information is needed from the node ‘<strong>${that.activeNodeName}</strong>‘`,
											causeDetailed: `Missing pairedItem data (node ‘${that.activeNodeName}‘ probably didn’t supply it)`,
											itemIndex,
										});
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

									// Before resolving the pairedItem make sure that the requested node comes in the
									// graph before the current one
									const parentNodes = that.workflow.getParentNodes(that.activeNodeName);
									if (!parentNodes.includes(nodeName)) {
										throw createExpressionError('Invalid expression', {
											messageTemplate: 'Invalid expression under ‘%%PARAMETER%%’',
											functionality: 'pairedItem',
											functionOverrides: {
												description: `The code uses data in the node <strong>‘${nodeName}’</strong> but there is no path back to it. Please check this node is connected to it (there can be other nodes in between).`,
												message: `No path back to node ‘${nodeName}’`,
											},
											description: `The expression uses data in the node <strong>‘${nodeName}’</strong> but there is no path back to it. Please check this node is connected to it (there can be other nodes in between).`,
											itemIndex,
										});
									}

									const sourceData: ISourceData = that.executeData.source.main[
										pairedItem.input || 0
									] as ISourceData;

									return getPairedItem(nodeName, sourceData, pairedItem);
								};

								if (property === 'item') {
									return pairedItemMethod();
								}
								return pairedItemMethod;
							}
							if (property === 'first') {
								return (branchIndex?: number, runIndex?: number) => {
									const executionData = getNodeOutput(nodeName, branchIndex, runIndex);
									if (executionData[0]) return executionData[0];
									return undefined;
								};
							}
							if (property === 'last') {
								return (branchIndex?: number, runIndex?: number) => {
									const executionData = getNodeOutput(nodeName, branchIndex, runIndex);
									if (!executionData.length) return undefined;
									if (executionData[executionData.length - 1]) {
										return executionData[executionData.length - 1];
									}
									return undefined;
								};
							}
							if (property === 'all') {
								return (branchIndex?: number, runIndex?: number) =>
									getNodeOutput(nodeName, branchIndex, runIndex);
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

			$input: new Proxy(
				{},
				{
					ownKeys(target) {
						return ['all', 'context', 'first', 'item', 'last', 'params'];
					},
					getOwnPropertyDescriptor(k) {
						return {
							enumerable: true,
							configurable: true,
						};
					},
					get(target, property, receiver) {
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
				},
			),

			$binary: {}, // Placeholder
			$data: {}, // Placeholder
			$env: this.envGetter(),
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
					that.timezone,
					that.additionalKeys,
					that.executeData,
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
					that.defaultTimezone,
					that.additionalKeys,
					that.executeData,
					defaultReturnRunIndex,
				);
				return dataProxy.getDataProxy();
			},
			$items: (nodeName?: string, outputIndex?: number, runIndex?: number) => {
				if (nodeName === undefined) {
					nodeName = (that.prevNodeGetter() as { name: string }).name;
				}

				outputIndex = outputIndex || 0;
				runIndex = runIndex === undefined ? -1 : runIndex;

				return that.getNodeExecutionData(nodeName, false, outputIndex, runIndex);
			},
			$json: {}, // Placeholder
			$node: this.nodeGetter(),
			$self: this.selfGetter(),
			$parameter: this.nodeParameterGetter(this.activeNodeName),
			$prevNode: this.prevNodeGetter(),
			$runIndex: this.runIndex,
			$mode: this.mode,
			$workflow: this.workflowGetter(),
			$itemIndex: this.itemIndex,
			$now: DateTime.now(),
			$today: DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }),
			$jmesPath: jmespathWrapper,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			DateTime,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Interval,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Duration,
			...that.additionalKeys,

			// deprecated
			$jmespath: jmespathWrapper,
			$position: this.itemIndex,
			$thisItem: that.connectionInputData[that.itemIndex],
			$thisItemIndex: this.itemIndex,
			$thisRunIndex: this.runIndex,
		};

		return new Proxy(base, {
			get(target, name, receiver) {
				if (['$data', '$json'].includes(name as string)) {
					return that.nodeDataGetter(that.activeNodeName, true)?.json;
				}
				if (name === '$binary') {
					return that.nodeDataGetter(that.activeNodeName, true)?.binary;
				}

				return Reflect.get(target, name, receiver);
			},
		});
	}
}
