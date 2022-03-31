/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { DateTime, Duration, Interval } from 'luxon';
import * as jmespath from 'jmespath';

// eslint-disable-next-line import/no-cycle
import {
	IDataObject,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	NodeHelpers,
	NodeParameterValue,
	Workflow,
	WorkflowExecuteMode,
} from '.';

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

	constructor(
		workflow: Workflow,
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		siblingParameters: INodeParameters,
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		defaultReturnRunIndex = -1,
		selfData = {},
	) {
		this.workflow = workflow;
		this.runExecutionData = runExecutionData;
		this.defaultReturnRunIndex = defaultReturnRunIndex;
		this.runIndex = runIndex;
		this.itemIndex = itemIndex;
		this.activeNodeName = activeNodeName;
		this.connectionInputData = connectionInputData;
		this.siblingParameters = siblingParameters;
		this.mode = mode;
		this.selfData = selfData;
		this.additionalKeys = additionalKeys;
	}

	/**
	 * Returns a proxy which allows to query context data of a given node
	 *
	 * @private
	 * @param {string} nodeName The name of the node to get the context from
	 * @returns
	 * @memberof WorkflowDataProxy
	 */
	private nodeContextGetter(nodeName: string) {
		const that = this;
		const node = this.workflow.nodes[nodeName];

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

					if (!contextData.hasOwnProperty(name)) {
						// Parameter does not exist on node
						throw new Error(`Could not find parameter "${name}" on context of node "${nodeName}"`);
					}

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
	 * @returns
	 * @memberof WorkflowDataGetter
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

				let returnValue:
					| INodeParameters
					| NodeParameterValue
					| NodeParameterValue[]
					| INodeParameters[];
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
						that.additionalKeys,
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
	 * @returns {INodeExecutionData[]}
	 * @memberof WorkflowDataProxy
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
				throw new Error(`Workflow did not run so do not have any execution-data.`);
			}

			if (!that.runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
				if (that.workflow.getNode(nodeName)) {
					throw new Error(
						`The node "${nodeName}" hasn't been executed yet, so you can't reference its output data`,
					);
				} else {
					throw new Error(`No node called "${nodeName}" in this workflow`);
				}
			}

			runIndex = runIndex === undefined ? that.defaultReturnRunIndex : runIndex;
			runIndex =
				runIndex === -1 ? that.runExecutionData.resultData.runData[nodeName].length - 1 : runIndex;

			if (that.runExecutionData.resultData.runData[nodeName].length <= runIndex) {
				throw new Error(`Run ${runIndex} of node "${nodeName}" not found`);
			}

			const taskData = that.runExecutionData.resultData.runData[nodeName][runIndex].data!;

			if (taskData.main === null || !taskData.main.length || taskData.main[0] === null) {
				// throw new Error(`No data found for item-index: "${itemIndex}"`);
				throw new Error(`No data found from "main" input.`);
			}

			// Check from which output to read the data.
			// Depends on how the nodes are connected.
			// (example "IF" node. If node is connected to "true" or to "false" output)
			if (outputIndex === undefined) {
				// eslint-disable-next-line @typescript-eslint/no-shadow
				const outputIndex = that.workflow.getNodeConnectionOutputIndex(
					that.activeNodeName,
					nodeName,
					'main',
				);

				if (outputIndex === undefined) {
					throw new Error(
						`The node "${that.activeNodeName}" is not connected with node "${nodeName}" so no data can get returned from it.`,
					);
				}
			}

			if (outputIndex === undefined) {
				outputIndex = 0;
			}

			if (taskData.main.length <= outputIndex) {
				throw new Error(`Node "${nodeName}" has no branch with index ${outputIndex}.`);
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
	 * @returns
	 * @memberof WorkflowDataGetter
	 */
	private nodeDataGetter(nodeName: string, shortSyntax = false) {
		const that = this;
		const node = this.workflow.nodes[nodeName];

		if (!node) {
			return undefined;
		}

		return new Proxy(
			{},
			{
				get(target, name, receiver) {
					name = name.toString();

					if (['binary', 'data', 'json'].includes(name)) {
						const executionData = that.getNodeExecutionData(nodeName, shortSyntax, undefined);

						if (executionData.length <= that.itemIndex) {
							throw new Error(`No data found for item-index: "${that.itemIndex}"`);
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
	 * @returns
	 * @memberof WorkflowDataGetter
	 */
	private envGetter() {
		return new Proxy(
			{},
			{
				get(target, name, receiver) {
					return process.env[name.toString()];
				},
			},
		);
	}

	/**
	 * Returns a proxt to query data from the workflow
	 *
	 * @private
	 * @returns
	 * @memberof WorkflowDataProxy
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
					if (!allowedValues.includes(name.toString())) {
						throw new Error(`The key "${name.toString()}" is not supported!`);
					}

					// @ts-ignore
					return that.workflow[name.toString()];
				},
			},
		);
	}

	/**
	 * Returns a proxy to query data of all nodes
	 *
	 * @private
	 * @returns
	 * @memberof WorkflowDataGetter
	 */
	private nodeGetter() {
		const that = this;
		return new Proxy(
			{},
			{
				get(target, name, receiver) {
					return that.nodeDataGetter(name.toString());
				},
			},
		);
	}

	/**
	 * Returns the data proxy object which allows to query data from current run
	 *
	 * @returns
	 * @memberof WorkflowDataGetter
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

		const base = {
			$: (nodeName: string) => {
				if (!nodeName) {
					throw new Error(`When calling $(), please specify a node`);
				}

				return new Proxy(
					{},
					{
						get(target, property, receiver) {
							if (property === 'pairedItem') {
								return () => {
									const executionData = getNodeOutput(nodeName, 0, that.runIndex);
									if (executionData[that.itemIndex]) {
										return executionData[that.itemIndex];
									}
									return undefined;
								};
							}
							if (property === 'item') {
								return (itemIndex?: number, branchIndex?: number, runIndex?: number) => {
									if (itemIndex === undefined) {
										itemIndex = that.itemIndex;
										branchIndex = 0;
										runIndex = that.runIndex;
									}
									const executionData = getNodeOutput(nodeName, branchIndex, runIndex);
									if (executionData[itemIndex]) {
										return executionData[itemIndex];
									}
									let errorMessage = '';

									if (branchIndex === undefined && runIndex === undefined) {
										errorMessage = `
											No item found at index ${itemIndex}
											(for node "${nodeName}")`;
										throw new Error(errorMessage);
									}
									if (branchIndex === undefined) {
										errorMessage = `
											No item found at index ${itemIndex}
											in run ${runIndex || that.runIndex}
											(for node "${nodeName}")`;
										throw new Error(errorMessage);
									}
									if (runIndex === undefined) {
										errorMessage = `
											No item found at index ${itemIndex}
											of branch ${branchIndex || 0}
											(for node "${nodeName}")`;
										throw new Error(errorMessage);
									}

									errorMessage = `
										No item found at index ${itemIndex}
										of branch ${branchIndex || 0}
										in run ${runIndex || that.runIndex}
										(for node "${nodeName}")`;
									throw new Error(errorMessage);
								};
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
					get(target, property, receiver) {
						if (property === 'thisItem') {
							return that.connectionInputData[that.itemIndex];
						}
						if (property === 'item') {
							return (itemIndex?: number) => {
								if (itemIndex === undefined) itemIndex = that.itemIndex;
								const result = that.connectionInputData;
								if (result[itemIndex]) {
									return result[itemIndex];
								}
								return undefined;
							};
						}
						if (property === 'first') {
							return () => {
								const result = that.connectionInputData;
								if (result[0]) {
									return result[0];
								}
								return undefined;
							};
						}
						if (property === 'last') {
							return () => {
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
						return Reflect.get(target, property, receiver);
					},
				},
			),

			$thisItem: that.connectionInputData[that.itemIndex],
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
					that.additionalKeys,
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
					defaultReturnRunIndex,
				);
				return dataProxy.getDataProxy();
			},
			$items: (nodeName?: string, outputIndex?: number, runIndex?: number) => {
				let executionData: INodeExecutionData[];

				if (nodeName === undefined) {
					executionData = that.connectionInputData;
				} else {
					outputIndex = outputIndex || 0;
					runIndex = runIndex === undefined ? -1 : runIndex;
					executionData = that.getNodeExecutionData(nodeName, false, outputIndex, runIndex);
				}

				return executionData;
			},
			$json: {}, // Placeholder
			$node: this.nodeGetter(),
			$self: this.selfGetter(),
			$parameter: this.nodeParameterGetter(this.activeNodeName),
			$position: this.itemIndex,
			$runIndex: this.runIndex,
			$mode: this.mode,
			$workflow: this.workflowGetter(),
			$thisRunIndex: this.runIndex,
			$thisItemIndex: this.itemIndex,
			$now: DateTime.now(),
			$today: DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }),
			$jmespath: jmespathWrapper,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			DateTime,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Interval,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Duration,
			...that.additionalKeys,
		};

		return new Proxy(base, {
			get(target, name, receiver) {
				if (['$data', '$json'].includes(name as string)) {
					// @ts-ignore
					return that.nodeDataGetter(that.activeNodeName, true).json;
				}
				if (name === '$binary') {
					// @ts-ignore
					return that.nodeDataGetter(that.activeNodeName, true).binary;
				}

				return Reflect.get(target, name, receiver);
			},
		});
	}
}
