import {
	IDataObject,
	INodeExecutionData,
	IRunExecutionData,
	IWorkflowDataProxyData,
	NodeHelpers,
	Workflow,
} from './';



export class WorkflowDataProxy {
	private workflow: Workflow;
	private runExecutionData: IRunExecutionData | null;
	private runIndex: number;
	private itemIndex: number;
	private activeNodeName: string;
	private connectionInputData: INodeExecutionData[];



	constructor(workflow: Workflow, runExecutionData: IRunExecutionData | null, runIndex: number, itemIndex: number, activeNodeName: string, connectionInputData: INodeExecutionData[]) {
		this.workflow = workflow;
		this.runExecutionData = runExecutionData;
		this.runIndex = runIndex;
		this.itemIndex = itemIndex;
		this.activeNodeName = activeNodeName;
		this.connectionInputData = connectionInputData;
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

		return new Proxy({}, {
			ownKeys(target) {
				if (Reflect.ownKeys(target).length === 0) {
					// Target object did not get set yet
					Object.assign(target, NodeHelpers.getContext(that.runExecutionData!, 'node', node));
				}

				return Reflect.ownKeys(target);
			},
			get(target, name, receiver) {
				name = name.toString();
				const contextData = NodeHelpers.getContext(that.runExecutionData!, 'node', node);

				if (!contextData.hasOwnProperty(name)) {
					// Parameter does not exist on node
					throw new Error(`Could not find parameter "${name}" on context of node "${nodeName}"`);
				}

				return contextData[name];
			}
		});
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
			get(target, name, receiver) {
				name = name.toString();

				if (!node.parameters.hasOwnProperty(name)) {
					// Parameter does not exist on node
					throw new Error(`Could not find parameter "${name}" on node "${nodeName}"`);
				}

				const returnValue = node.parameters[name];

				if (typeof returnValue === 'string' && returnValue.charAt(0) === '=') {
					// The found value is an expression so resolve it
					return that.workflow.getParameterValue(returnValue, that.runExecutionData, that.runIndex, that.itemIndex, that.activeNodeName, that.connectionInputData);
				}

				return returnValue;
			}
		});
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
			throw new Error(`The node "${nodeName}" does not exist!`);
		}

		return new Proxy({}, {
			get(target, name, receiver) {
				name = name.toString();

				if (['binary', 'data'].includes(name)) {
					let executionData: INodeExecutionData[];
					if (shortSyntax === false) {
						// Long syntax got used to return data from node in path

						if (that.runExecutionData === null) {
							throw new Error(`Workflow did not run so do not have any execution-data.`);
						}

						if (!that.runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
							throw new Error(`No execution data found for node "${nodeName}"`);
						}

						if (that.runExecutionData.resultData.runData[nodeName].length < that.runIndex) {
							throw new Error(`No execution data found for run "${that.runIndex}" of node "${nodeName}"`);
						}

						const taskData = that.runExecutionData.resultData.runData[nodeName][that.runIndex].data!;

						if (taskData.main === null || !taskData.main.length || taskData.main[0] === null) {
							// throw new Error(`No data found for item-index: "${itemIndex}"`);
							throw new Error(`No data found from "main" input.`);
						}

						// Check from which output to read the data.
						// Depends on how the nodes are connected.
						// (example "IF" node. If node is connected to "true" or to "false" output)
						const outputIndex = that.workflow.getNodeConnectionOutputIndex(that.activeNodeName, nodeName, 'main');

						if (outputIndex === undefined) {
							throw new Error(`The node "${that.activeNodeName}" is not connected with node "${nodeName}" so no data can get returned from it.`);
						}

						if (taskData.main.length < outputIndex) {
							throw new Error(`No data found from "main" input with index "${outputIndex}" via which node is connected with.`);
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

					if (executionData.length <= that.itemIndex) {
						throw new Error(`No data found for item-index: "${that.itemIndex}"`);
					}

					if (name === 'data') {
						// JSON-Data
						return executionData[that.itemIndex].json;
					} else if (name === 'binary') {
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
				}

				return Reflect.get(target, name, receiver);
			}
		});
	}



	/**
	 * Returns a proxy to query data from the environment
	 *
	 * @private
	 * @returns
	 * @memberof WorkflowDataGetter
	 */
	private envGetter() {
		return new Proxy({}, {
			get(target, name, receiver) {
				return process.env[name.toString()];
			}
		});
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
		return new Proxy({}, {
			get(target, name, receiver) {
				return that.nodeDataGetter(name.toString());
			}
		});
	}



	/**
	 * Returns the data proxy object which allows to query data from current run
	 *
	 * @returns
	 * @memberof WorkflowDataGetter
	 */
	getDataProxy(): IWorkflowDataProxyData {
		const that = this;

		const base = {
			$binary: {}, // Placeholder
			$data: {}, // Placeholder
			$env: this.envGetter(),
			$node: this.nodeGetter(),
			$parameter: this.nodeParameterGetter(this.activeNodeName),
		};

		return new Proxy(base, {
			get(target, name, receiver) {
				if (name === '$data') {
					// @ts-ignore
					return that.nodeDataGetter(that.activeNodeName, true).data;
				} else if (name === '$binary') {
					// @ts-ignore
					return that.nodeDataGetter(that.activeNodeName, true).binary;
				}

				return Reflect.get(target, name, receiver);
			}
		});
	}
}
