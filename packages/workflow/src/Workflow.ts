/* eslint-disable @typescript-eslint/no-use-before-define */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-for-in-array */

/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import type {
	IConnections,
	IExecuteResponsePromiseData,
	IGetExecuteTriggerFunctions,
	INode,
	INodeExecuteFunctions,
	INodeExecutionData,
	INodeIssues,
	INodeParameters,
	INodes,
	INodeType,
	INodeTypes,
	IPinData,
	IPollFunctions,
	IRunExecutionData,
	ITaskDataConnections,
	ITriggerResponse,
	IWebhookData,
	IWebhookResponseData,
	IWorkflowIssues,
	IWorkflowExecuteAdditionalData,
	IWorkflowSettings,
	WebhookSetupMethodNames,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	IConnection,
	IConnectedNode,
	IDataObject,
	IExecuteData,
	INodeConnection,
	IObservableObject,
	IRun,
	IRunNodeResponse,
	NodeParameterValueType,
	ConnectionTypes,
	CloseFunction,
	INodeOutputConfiguration,
} from './Interfaces';
import { Node, NodeConnectionType } from './Interfaces';
import type { IDeferredPromise } from './DeferredPromise';

import * as NodeHelpers from './NodeHelpers';
import * as ObservableObject from './ObservableObject';
import { RoutingNode } from './RoutingNode';
import { Expression } from './Expression';
import {
	MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE,
	NODES_WITH_RENAMABLE_CONTENT,
	STARTING_NODE_TYPES,
} from './Constants';
import { ApplicationError } from './errors/application.error';

function dedupe<T>(arr: T[]): T[] {
	return [...new Set(arr)];
}

export class Workflow {
	id: string;

	name: string | undefined;

	nodes: INodes = {};

	connectionsBySourceNode: IConnections;

	connectionsByDestinationNode: IConnections;

	nodeTypes: INodeTypes;

	expression: Expression;

	active: boolean;

	settings: IWorkflowSettings;

	// To save workflow specific static data like for example
	// ids of registered webhooks of nodes
	staticData: IDataObject;

	testStaticData: IDataObject | undefined;

	pinData?: IPinData;

	// constructor(id: string | undefined, nodes: INode[], connections: IConnections, active: boolean, nodeTypes: INodeTypes, staticData?: IDataObject, settings?: IWorkflowSettings) {
	constructor(parameters: {
		id?: string;
		name?: string;
		nodes: INode[];
		connections: IConnections;
		active: boolean;
		nodeTypes: INodeTypes;
		staticData?: IDataObject;
		settings?: IWorkflowSettings;
		pinData?: IPinData;
	}) {
		this.id = parameters.id as string; // @tech_debt Ensure this is not optional
		this.name = parameters.name;
		this.nodeTypes = parameters.nodeTypes;
		this.pinData = parameters.pinData;

		// Save nodes in workflow as object to be able to get the
		// nodes easily by its name.
		// Also directly add the default values of the node type.
		let nodeType: INodeType | undefined;
		for (const node of parameters.nodes) {
			this.nodes[node.name] = node;

			nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			if (nodeType === undefined) {
				// Go on to next node when its type is not known.
				// For now do not error because that causes problems with
				// expression resolution also then when the unknown node
				// does not get used.
				continue;
				// throw new ApplicationError(`Node with unknown node type`, {
				// 	tags: { nodeType: node.type },
				// 	extra: { node },
				// });
			}

			// Add default values
			const nodeParameters = NodeHelpers.getNodeParameters(
				nodeType.description.properties,
				node.parameters,
				true,
				false,
				node,
			);
			node.parameters = nodeParameters !== null ? nodeParameters : {};
		}
		this.connectionsBySourceNode = parameters.connections;

		// Save also the connections by the destination nodes
		this.connectionsByDestinationNode = this.__getConnectionsByDestination(parameters.connections);

		this.active = parameters.active || false;

		this.staticData = ObservableObject.create(parameters.staticData || {}, undefined, {
			ignoreEmptyOnFirstChild: true,
		});

		this.settings = parameters.settings || {};

		this.expression = new Expression(this);
	}

	/**
	 * The default connections are by source node. This function rewrites them by destination nodes
	 * to easily find parent nodes.
	 *
	 */
	__getConnectionsByDestination(connections: IConnections): IConnections {
		const returnConnection: IConnections = {};

		let connectionInfo;
		let maxIndex: number;
		for (const sourceNode in connections) {
			if (!connections.hasOwnProperty(sourceNode)) {
				continue;
			}

			for (const type of Object.keys(connections[sourceNode]) as NodeConnectionType[]) {
				if (!connections[sourceNode].hasOwnProperty(type)) {
					continue;
				}
				for (const inputIndex in connections[sourceNode][type]) {
					if (!connections[sourceNode][type].hasOwnProperty(inputIndex)) {
						continue;
					}
					for (connectionInfo of connections[sourceNode][type][inputIndex]) {
						if (!returnConnection.hasOwnProperty(connectionInfo.node)) {
							returnConnection[connectionInfo.node] = {};
						}
						if (!returnConnection[connectionInfo.node].hasOwnProperty(connectionInfo.type)) {
							returnConnection[connectionInfo.node][connectionInfo.type] = [];
						}

						maxIndex = returnConnection[connectionInfo.node][connectionInfo.type].length - 1;
						for (let j = maxIndex; j < connectionInfo.index; j++) {
							returnConnection[connectionInfo.node][connectionInfo.type].push([]);
						}

						returnConnection[connectionInfo.node][connectionInfo.type][connectionInfo.index].push({
							node: sourceNode,
							type,
							index: parseInt(inputIndex, 10),
						});
					}
				}
			}
		}

		return returnConnection;
	}

	/**
	 * A workflow can only be activated if it has a node which has either triggers
	 * or webhooks defined.
	 *
	 * @param {string[]} [ignoreNodeTypes] Node-types to ignore in the check
	 */
	checkIfWorkflowCanBeActivated(ignoreNodeTypes?: string[]): boolean {
		let node: INode;
		let nodeType: INodeType | undefined;

		for (const nodeName of Object.keys(this.nodes)) {
			node = this.nodes[nodeName];

			if (node.disabled === true) {
				// Deactivated nodes can not trigger a run so ignore
				continue;
			}

			if (ignoreNodeTypes !== undefined && ignoreNodeTypes.includes(node.type)) {
				continue;
			}

			nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			if (nodeType === undefined) {
				// Type is not known so check is not possible
				continue;
			}

			if (
				nodeType.poll !== undefined ||
				nodeType.trigger !== undefined ||
				nodeType.webhook !== undefined
			) {
				// Is a trigger node. So workflow can be activated.
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if everything in the workflow is complete
	 * and ready to be executed. If it returns null everything
	 * is fine. If there are issues it returns the issues
	 * which have been found for the different nodes.
	 * TODO: Does currently not check for credential issues!
	 *
	 */
	checkReadyForExecution(inputData: {
		startNode?: string;
		destinationNode?: string;
		pinDataNodeNames?: string[];
	}): IWorkflowIssues | null {
		let node: INode;
		let nodeType: INodeType | undefined;
		let nodeIssues: INodeIssues | null = null;
		const workflowIssues: IWorkflowIssues = {};

		let checkNodes: string[] = [];
		if (inputData.destinationNode) {
			// If a destination node is given we have to check all the nodes
			// leading up to it
			checkNodes = this.getParentNodes(inputData.destinationNode);
			checkNodes.push(inputData.destinationNode);
		} else if (inputData.startNode) {
			// If a start node is given we have to check all nodes which
			// come after it
			checkNodes = this.getChildNodes(inputData.startNode);
			checkNodes.push(inputData.startNode);
		}

		for (const nodeName of checkNodes) {
			nodeIssues = null;
			node = this.nodes[nodeName];

			if (node.disabled === true) {
				continue;
			}

			nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			if (nodeType === undefined) {
				// Node type is not known
				nodeIssues = {
					typeUnknown: true,
				};
			} else {
				nodeIssues = NodeHelpers.getNodeParametersIssues(
					nodeType.description.properties,
					node,
					inputData.pinDataNodeNames,
				);
			}

			if (nodeIssues !== null) {
				workflowIssues[node.name] = nodeIssues;
			}
		}

		if (Object.keys(workflowIssues).length === 0) {
			return null;
		}

		return workflowIssues;
	}

	/**
	 * Returns the static data of the workflow.
	 * It gets saved with the workflow and will be the same for
	 * all workflow-executions.
	 *
	 * @param {string} type The type of data to return ("global"|"node")
	 * @param {INode} [node] If type is set to "node" then the node has to be provided
	 */
	getStaticData(type: string, node?: INode): IDataObject {
		let key: string;
		if (type === 'global') {
			key = 'global';
		} else if (type === 'node') {
			if (node === undefined) {
				throw new ApplicationError(
					'The request data of context type "node" the node parameter has to be set!',
				);
			}
			key = `node:${node.name}`;
		} else {
			throw new ApplicationError('Unknown context type. Only `global` and `node` are supported.', {
				extra: { contextType: type },
			});
		}

		if (this.testStaticData?.[key]) return this.testStaticData[key] as IDataObject;

		if (this.staticData[key] === undefined) {
			// Create it as ObservableObject that we can easily check if the data changed
			// to know if the workflow with its data has to be saved afterwards or not.
			this.staticData[key] = ObservableObject.create({}, this.staticData as IObservableObject);
		}

		return this.staticData[key] as IDataObject;
	}

	setTestStaticData(testStaticData: IDataObject) {
		this.testStaticData = testStaticData;
	}

	/**
	 * Returns all the trigger nodes in the workflow.
	 *
	 */
	getTriggerNodes(): INode[] {
		return this.queryNodes((nodeType: INodeType) => !!nodeType.trigger);
	}

	/**
	 * Returns all the poll nodes in the workflow
	 *
	 */
	getPollNodes(): INode[] {
		return this.queryNodes((nodeType: INodeType) => !!nodeType.poll);
	}

	/**
	 * Returns all the nodes in the workflow for which the given
	 * checkFunction return true
	 *
	 * @param {(nodeType: INodeType) => boolean} checkFunction
	 */
	queryNodes(checkFunction: (nodeType: INodeType) => boolean): INode[] {
		const returnNodes: INode[] = [];

		// Check if it has any of them
		let node: INode;
		let nodeType: INodeType | undefined;

		for (const nodeName of Object.keys(this.nodes)) {
			node = this.nodes[nodeName];

			if (node.disabled === true) {
				continue;
			}

			nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			if (nodeType !== undefined && checkFunction(nodeType)) {
				returnNodes.push(node);
			}
		}

		return returnNodes;
	}

	/**
	 * Returns the node with the given name if it exists else null
	 *
	 * @param {string} nodeName Name of the node to return
	 */
	getNode(nodeName: string): INode | null {
		if (this.nodes.hasOwnProperty(nodeName)) {
			return this.nodes[nodeName];
		}

		return null;
	}

	/**
	 * Returns the pinData of the node with the given name if it exists
	 *
	 * @param {string} nodeName Name of the node to return the pinData of
	 */
	getPinDataOfNode(nodeName: string): IDataObject[] | undefined {
		return this.pinData ? this.pinData[nodeName] : undefined;
	}

	renameNodeInParameterValue(
		parameterValue: NodeParameterValueType,
		currentName: string,
		newName: string,
		{ hasRenamableContent } = { hasRenamableContent: false },
	): NodeParameterValueType {
		if (typeof parameterValue !== 'object') {
			// Reached the actual value
			if (
				typeof parameterValue === 'string' &&
				(parameterValue.charAt(0) === '=' || hasRenamableContent)
			) {
				// Is expression so has to be rewritten
				// To not run the "expensive" regex stuff when it is not needed
				// make a simple check first if it really contains the the node-name
				if (parameterValue.includes(currentName)) {
					// Really contains node-name (even though we do not know yet if really as $node-expression)

					const escapedOldName = backslashEscape(currentName); // for match
					const escapedNewName = dollarEscape(newName); // for replacement

					const setNewName = (expression: string, oldPattern: string) =>
						expression.replace(new RegExp(oldPattern, 'g'), `$1${escapedNewName}$2`);

					if (parameterValue.includes('$(')) {
						const oldPattern = String.raw`(\$\(['"])${escapedOldName}(['"]\))`;
						parameterValue = setNewName(parameterValue, oldPattern);
					}

					if (parameterValue.includes('$node[')) {
						const oldPattern = String.raw`(\$node\[['"])${escapedOldName}(['"]\])`;
						parameterValue = setNewName(parameterValue, oldPattern);
					}

					if (parameterValue.includes('$node.')) {
						const oldPattern = String.raw`(\$node\.)${escapedOldName}(\.?)`;
						parameterValue = setNewName(parameterValue, oldPattern);

						if (hasDotNotationBannedChar(newName)) {
							const regex = new RegExp(`.${backslashEscape(newName)}( |\\.)`, 'g');
							parameterValue = parameterValue.replace(regex, `["${escapedNewName}"]$1`);
						}
					}

					if (parameterValue.includes('$items(')) {
						const oldPattern = String.raw`(\$items\(['"])${escapedOldName}(['"],|['"]\))`;
						parameterValue = setNewName(parameterValue, oldPattern);
					}
				}
			}

			return parameterValue;
		}

		if (Array.isArray(parameterValue)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const returnArray: any[] = [];

			for (const currentValue of parameterValue) {
				returnArray.push(
					this.renameNodeInParameterValue(
						currentValue as NodeParameterValueType,
						currentName,
						newName,
					),
				);
			}

			return returnArray;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const returnData: any = {};

		for (const parameterName of Object.keys(parameterValue || {})) {
			returnData[parameterName] = this.renameNodeInParameterValue(
				parameterValue![parameterName as keyof typeof parameterValue],
				currentName,
				newName,
				{ hasRenamableContent },
			);
		}

		return returnData;
	}

	/**
	 * Rename a node in the workflow
	 *
	 * @param {string} currentName The current name of the node
	 * @param {string} newName The new name
	 */
	renameNode(currentName: string, newName: string) {
		// Rename the node itself
		if (this.nodes[currentName] !== undefined) {
			this.nodes[newName] = this.nodes[currentName];
			this.nodes[newName].name = newName;
			delete this.nodes[currentName];
		}

		// Update the expressions which reference the node
		// with its old name
		for (const node of Object.values(this.nodes)) {
			node.parameters = this.renameNodeInParameterValue(
				node.parameters,
				currentName,
				newName,
			) as INodeParameters;

			if (NODES_WITH_RENAMABLE_CONTENT.has(node.type)) {
				node.parameters.jsCode = this.renameNodeInParameterValue(
					node.parameters.jsCode,
					currentName,
					newName,
					{ hasRenamableContent: true },
				);
			}
		}

		// Change all source connections
		if (this.connectionsBySourceNode.hasOwnProperty(currentName)) {
			this.connectionsBySourceNode[newName] = this.connectionsBySourceNode[currentName];
			delete this.connectionsBySourceNode[currentName];
		}

		// Change all destination connections
		let sourceNode: string;
		let type: string;
		let sourceIndex: string;
		let connectionIndex: string;
		let connectionData: IConnection;
		for (sourceNode of Object.keys(this.connectionsBySourceNode)) {
			for (type of Object.keys(this.connectionsBySourceNode[sourceNode])) {
				for (sourceIndex of Object.keys(this.connectionsBySourceNode[sourceNode][type])) {
					for (connectionIndex of Object.keys(
						this.connectionsBySourceNode[sourceNode][type][parseInt(sourceIndex, 10)],
					)) {
						connectionData =
							this.connectionsBySourceNode[sourceNode][type][parseInt(sourceIndex, 10)][
								parseInt(connectionIndex, 10)
							];
						if (connectionData.node === currentName) {
							connectionData.node = newName;
						}
					}
				}
			}
		}

		// Use the updated connections to create updated connections by destination nodes
		this.connectionsByDestinationNode = this.__getConnectionsByDestination(
			this.connectionsBySourceNode,
		);
	}

	/**
	 * Finds the highest parent nodes of the node with the given name
	 *
	 * @param {ConnectionTypes} [type='main']
	 */
	getHighestNode(
		nodeName: string,
		type: ConnectionTypes = 'main',
		nodeConnectionIndex?: number,
		checkedNodes?: string[],
	): string[] {
		const currentHighest: string[] = [];
		if (this.nodes[nodeName].disabled === false) {
			// If the current node is not disabled itself is the highest
			currentHighest.push(nodeName);
		}

		if (!this.connectionsByDestinationNode.hasOwnProperty(nodeName)) {
			// Node does not have incoming connections
			return currentHighest;
		}

		if (!this.connectionsByDestinationNode[nodeName].hasOwnProperty(type)) {
			// Node does not have incoming connections of given type
			return currentHighest;
		}

		checkedNodes = checkedNodes || [];

		if (checkedNodes.includes(nodeName)) {
			// Node got checked already before
			return currentHighest;
		}

		checkedNodes.push(nodeName);

		const returnNodes: string[] = [];
		let addNodes: string[];

		let connectionsByIndex: IConnection[];
		for (
			let connectionIndex = 0;
			connectionIndex < this.connectionsByDestinationNode[nodeName][type].length;
			connectionIndex++
		) {
			if (nodeConnectionIndex !== undefined && nodeConnectionIndex !== connectionIndex) {
				// If a connection-index is given ignore all other ones
				continue;
			}
			connectionsByIndex = this.connectionsByDestinationNode[nodeName][type][connectionIndex];
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			connectionsByIndex.forEach((connection) => {
				if (checkedNodes.includes(connection.node)) {
					// Node got checked already before
					return;
				}

				addNodes = this.getHighestNode(connection.node, type, undefined, checkedNodes);

				if (addNodes.length === 0) {
					// The checked node does not have any further parents so add it
					// if it is not disabled
					if (this.nodes[connection.node].disabled !== true) {
						addNodes = [connection.node];
					}
				}

				addNodes.forEach((name) => {
					// Only add if node is not on the list already anyway
					if (returnNodes.indexOf(name) === -1) {
						returnNodes.push(name);
					}
				});
			});
		}

		return returnNodes;
	}

	/**
	 * Returns all the after the given one
	 *
	 * @param {string} [type='main']
	 * @param {*} [depth=-1]
	 */
	getChildNodes(
		nodeName: string,
		type: ConnectionTypes | 'ALL' | 'ALL_NON_MAIN' = 'main',
		depth = -1,
	): string[] {
		return this.getConnectedNodes(this.connectionsBySourceNode, nodeName, type, depth);
	}

	/**
	 * Returns all the nodes before the given one
	 *
	 * @param {ConnectionTypes} [type='main']
	 * @param {*} [depth=-1]
	 */
	getParentNodes(
		nodeName: string,
		type: ConnectionTypes | 'ALL' | 'ALL_NON_MAIN' = 'main',
		depth = -1,
	): string[] {
		return this.getConnectedNodes(this.connectionsByDestinationNode, nodeName, type, depth);
	}

	/**
	 * Gets all the nodes which are connected nodes starting from
	 * the given one
	 *
	 * @param {ConnectionTypes} [type='main']
	 * @param {*} [depth=-1]
	 */
	getConnectedNodes(
		connections: IConnections,
		nodeName: string,
		connectionType: ConnectionTypes | 'ALL' | 'ALL_NON_MAIN' = 'main',
		depth = -1,
		checkedNodesIncoming?: string[],
	): string[] {
		depth = depth === -1 ? -1 : depth;
		const newDepth = depth === -1 ? depth : depth - 1;
		if (depth === 0) {
			// Reached max depth
			return [];
		}

		if (!connections.hasOwnProperty(nodeName)) {
			// Node does not have incoming connections
			return [];
		}

		let types: ConnectionTypes[];
		if (connectionType === 'ALL') {
			types = Object.keys(connections[nodeName]) as ConnectionTypes[];
		} else if (connectionType === 'ALL_NON_MAIN') {
			types = Object.keys(connections[nodeName]).filter(
				(type) => type !== 'main',
			) as ConnectionTypes[];
		} else {
			types = [connectionType];
		}

		let addNodes: string[];
		let nodeIndex: number;
		let i: number;
		let parentNodeName: string;
		const returnNodes: string[] = [];

		types.forEach((type) => {
			if (!connections[nodeName].hasOwnProperty(type)) {
				// Node does not have incoming connections of given type
				return;
			}

			const checkedNodes = checkedNodesIncoming ? [...checkedNodesIncoming] : [];

			if (checkedNodes.includes(nodeName)) {
				// Node got checked already before
				return;
			}

			checkedNodes.push(nodeName);

			connections[nodeName][type].forEach((connectionsByIndex) => {
				connectionsByIndex.forEach((connection) => {
					if (checkedNodes.includes(connection.node)) {
						// Node got checked already before
						return;
					}

					returnNodes.unshift(connection.node);

					addNodes = this.getConnectedNodes(
						connections,
						connection.node,
						connectionType,
						newDepth,
						checkedNodes,
					);

					for (i = addNodes.length; i--; i > 0) {
						// Because nodes can have multiple parents it is possible that
						// parts of the tree is parent of both and to not add nodes
						// twice check first if they already got added before.
						parentNodeName = addNodes[i];
						nodeIndex = returnNodes.indexOf(parentNodeName);

						if (nodeIndex !== -1) {
							// Node got found before so remove it from current location
							// that node-order stays correct
							returnNodes.splice(nodeIndex, 1);
						}

						returnNodes.unshift(parentNodeName);
					}
				});
			});
		});

		return returnNodes;
	}

	/**
	 * Returns all the nodes before the given one
	 *
	 * @param {*} [maxDepth=-1]
	 */
	getParentNodesByDepth(nodeName: string, maxDepth = -1): IConnectedNode[] {
		return this.searchNodesBFS(this.connectionsByDestinationNode, nodeName, maxDepth);
	}

	/**
	 * Gets all the nodes which are connected nodes starting from
	 * the given one
	 * Uses BFS traversal
	 *
	 * @param {*} [maxDepth=-1]
	 */
	searchNodesBFS(connections: IConnections, sourceNode: string, maxDepth = -1): IConnectedNode[] {
		const returnConns: IConnectedNode[] = [];

		const type: ConnectionTypes = 'main';
		let queue: IConnectedNode[] = [];
		queue.push({
			name: sourceNode,
			depth: 0,
			indicies: [],
		});

		const visited: { [key: string]: IConnectedNode } = {};

		let depth = 0;
		while (queue.length > 0) {
			if (maxDepth !== -1 && depth > maxDepth) {
				break;
			}
			depth++;

			const toAdd = [...queue];
			queue = [];

			// eslint-disable-next-line @typescript-eslint/no-loop-func
			toAdd.forEach((curr) => {
				if (visited[curr.name]) {
					visited[curr.name].indicies = dedupe(visited[curr.name].indicies.concat(curr.indicies));
					return;
				}

				visited[curr.name] = curr;
				if (curr.name !== sourceNode) {
					returnConns.push(curr);
				}

				if (
					!connections.hasOwnProperty(curr.name) ||
					!connections[curr.name].hasOwnProperty(type)
				) {
					return;
				}

				connections[curr.name][type].forEach((connectionsByIndex) => {
					connectionsByIndex.forEach((connection) => {
						queue.push({
							name: connection.node,
							indicies: [connection.index],
							depth,
						});
					});
				});
			});
		}

		return returnConns;
	}

	getParentMainInputNode(node: INode): INode {
		if (node) {
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			const outputs = NodeHelpers.getNodeOutputs(this, node, nodeType.description);

			if (
				!!outputs.find(
					(output) =>
						((output as INodeOutputConfiguration)?.type ?? output) !== NodeConnectionType.Main,
				)
			) {
				// Get the first node which is connected to a non-main output
				const nonMainNodesConnected = outputs?.reduce((acc, outputName) => {
					const parentNodes = this.getChildNodes(
						node.name,
						(outputName as INodeOutputConfiguration)?.type ?? outputName,
					);
					if (parentNodes.length > 0) {
						acc.push(...parentNodes);
					}
					return acc;
				}, [] as string[]);

				if (nonMainNodesConnected.length) {
					const returnNode = this.getNode(nonMainNodesConnected[0]);
					if (returnNode === null) {
						// This should theoretically never happen as the node is connected
						// but who knows and it makes TS happy
						throw new ApplicationError(`Node "${nonMainNodesConnected[0]}" not found`);
					}

					// The chain of non-main nodes is potentially not finished yet so
					// keep on going
					return this.getParentMainInputNode(returnNode);
				}
			}
		}

		return node;
	}

	/**
	 * Returns via which output of the parent-node and index the current node
	 * they are connected
	 *
	 * @param {string} nodeName The node to check how it is connected with parent node
	 * @param {string} parentNodeName The parent node to get the output index of
	 * @param {string} [type='main']
	 * @param {*} [depth=-1]
	 */
	getNodeConnectionIndexes(
		nodeName: string,
		parentNodeName: string,
		type: ConnectionTypes = 'main',
		depth = -1,
		checkedNodes?: string[],
	): INodeConnection | undefined {
		const node = this.getNode(parentNodeName);
		if (node === null) {
			return undefined;
		}

		depth = depth === -1 ? -1 : depth;
		const newDepth = depth === -1 ? depth : depth - 1;
		if (depth === 0) {
			// Reached max depth
			return undefined;
		}

		if (!this.connectionsByDestinationNode.hasOwnProperty(nodeName)) {
			// Node does not have incoming connections
			return undefined;
		}

		if (!this.connectionsByDestinationNode[nodeName].hasOwnProperty(type)) {
			// Node does not have incoming connections of given type
			return undefined;
		}

		checkedNodes = checkedNodes || [];

		if (checkedNodes.includes(nodeName)) {
			// Node got checked already before
			return undefined;
		}

		checkedNodes.push(nodeName);

		let outputIndex: INodeConnection | undefined;
		for (const connectionsByIndex of this.connectionsByDestinationNode[nodeName][type]) {
			for (
				let destinationIndex = 0;
				destinationIndex < connectionsByIndex.length;
				destinationIndex++
			) {
				const connection = connectionsByIndex[destinationIndex];
				if (parentNodeName === connection.node) {
					return {
						sourceIndex: connection.index,
						destinationIndex,
					};
				}

				if (checkedNodes.includes(connection.node)) {
					// Node got checked already before so continue with the next one
					continue;
				}

				outputIndex = this.getNodeConnectionIndexes(
					connection.node,
					parentNodeName,
					type,
					newDepth,
					checkedNodes,
				);

				if (outputIndex !== undefined) {
					return outputIndex;
				}
			}
		}

		return undefined;
	}

	/**
	 * Returns from which of the given nodes the workflow should get started from
	 *
	 * @param {string[]} nodeNames The potential start nodes
	 */
	__getStartNode(nodeNames: string[]): INode | undefined {
		// Check if there are any trigger or poll nodes and then return the first one
		let node: INode;
		let nodeType: INodeType;
		for (const nodeName of nodeNames) {
			node = this.nodes[nodeName];

			if (nodeNames.length === 1 && !node.disabled) {
				return node;
			}

			nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			// TODO: Identify later differently
			if (nodeType.description.name === MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE) {
				continue;
			}

			if (nodeType && (nodeType.trigger !== undefined || nodeType.poll !== undefined)) {
				if (node.disabled === true) {
					continue;
				}
				return node;
			}
		}

		const sortedNodeNames = Object.values(this.nodes)
			.sort((a, b) => STARTING_NODE_TYPES.indexOf(a.type) - STARTING_NODE_TYPES.indexOf(b.type))
			.map((n) => n.name);

		for (const nodeName of sortedNodeNames) {
			node = this.nodes[nodeName];
			if (STARTING_NODE_TYPES.includes(node.type)) {
				if (node.disabled === true) {
					continue;
				}
				return node;
			}
		}

		return undefined;
	}

	/**
	 * Returns the start node to start the workflow from
	 *
	 */
	getStartNode(destinationNode?: string): INode | undefined {
		if (destinationNode) {
			// Find the highest parent nodes of the given one
			const nodeNames = this.getHighestNode(destinationNode);

			if (nodeNames.length === 0) {
				// If no parent nodes have been found then only the destination-node
				// is in the tree so add that one
				nodeNames.push(destinationNode);
			}

			// Check which node to return as start node
			const node = this.__getStartNode(nodeNames);
			if (node !== undefined) {
				return node;
			}

			// If none of the above did find anything simply return the
			// first parent node in the list
			return this.nodes[nodeNames[0]];
		}

		return this.__getStartNode(Object.keys(this.nodes));
	}

	async createWebhookIfNotExists(
		webhookData: IWebhookData,
		nodeExecuteFunctions: INodeExecuteFunctions,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<void> {
		const webhookExists = await this.runWebhookMethod(
			'checkExists',
			webhookData,
			nodeExecuteFunctions,
			mode,
			activation,
		);
		if (!webhookExists) {
			// If webhook does not exist yet create it
			await this.runWebhookMethod('create', webhookData, nodeExecuteFunctions, mode, activation);
		}
	}

	async deleteWebhook(
		webhookData: IWebhookData,
		nodeExecuteFunctions: INodeExecuteFunctions,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
		await this.runWebhookMethod('delete', webhookData, nodeExecuteFunctions, mode, activation);
	}

	private async runWebhookMethod(
		method: WebhookSetupMethodNames,
		webhookData: IWebhookData,
		nodeExecuteFunctions: INodeExecuteFunctions,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<boolean | undefined> {
		const node = this.getNode(webhookData.node);

		if (!node) return;

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		const webhookFn = nodeType.webhookMethods?.[webhookData.webhookDescription.name]?.[method];
		if (webhookFn === undefined) return;

		const thisArgs = nodeExecuteFunctions.getExecuteHookFunctions(
			this,
			node,
			webhookData.workflowExecuteAdditionalData,
			mode,
			activation,
			webhookData,
		);

		return await webhookFn.call(thisArgs);
	}

	/**
	 * Runs the given trigger node so that it can trigger the workflow
	 * when the node has data.
	 *
	 */
	async runTrigger(
		node: INode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<ITriggerResponse | undefined> {
		const triggerFunctions = getTriggerFunctions(this, node, additionalData, mode, activation);

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (nodeType === undefined) {
			throw new ApplicationError('Node with unknown node type', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		if (!nodeType.trigger) {
			throw new ApplicationError('Node type does not have a trigger function defined', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		if (mode === 'manual') {
			// In manual mode we do not just start the trigger function we also
			// want to be able to get informed as soon as the first data got emitted
			const triggerResponse = await nodeType.trigger.call(triggerFunctions);

			// Add the manual trigger response which resolves when the first time data got emitted
			triggerResponse!.manualTriggerResponse = new Promise((resolve, reject) => {
				triggerFunctions.emit = (
					(resolveEmit) =>
					(
						data: INodeExecutionData[][],
						responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
						donePromise?: IDeferredPromise<IRun>,
					) => {
						additionalData.hooks!.hookFunctions.sendResponse = [
							async (response: IExecuteResponsePromiseData): Promise<void> => {
								if (responsePromise) {
									responsePromise.resolve(response);
								}
							},
						];

						if (donePromise) {
							additionalData.hooks!.hookFunctions.workflowExecuteAfter?.unshift(
								async (runData: IRun): Promise<void> => {
									return donePromise.resolve(runData);
								},
							);
						}

						resolveEmit(data);
					}
				)(resolve);
				triggerFunctions.emitError = (
					(rejectEmit) =>
					(error: Error, responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>) => {
						additionalData.hooks!.hookFunctions.sendResponse = [
							async (): Promise<void> => {
								if (responsePromise) {
									responsePromise.reject(error);
								}
							},
						];

						rejectEmit(error);
					}
				)(reject);
			});

			return triggerResponse;
		}
		// In all other modes simply start the trigger
		return await nodeType.trigger.call(triggerFunctions);
	}

	/**
	 * Runs the given trigger node so that it can trigger the workflow
	 * when the node has data.
	 *
	 */

	async runPoll(
		node: INode,
		pollFunctions: IPollFunctions,
	): Promise<INodeExecutionData[][] | null> {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (nodeType === undefined) {
			throw new ApplicationError('Node with unknown node type', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		if (!nodeType.poll) {
			throw new ApplicationError('Node type does not have a poll function defined', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		return await nodeType.poll.call(pollFunctions);
	}

	/**
	 * Executes the webhook data to see what it should return and if the
	 * workflow should be started or not
	 *
	 */
	async runWebhook(
		webhookData: IWebhookData,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeExecuteFunctions: INodeExecuteFunctions,
		mode: WorkflowExecuteMode,
	): Promise<IWebhookResponseData> {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType === undefined) {
			throw new ApplicationError('Unknown node type of webhook node', {
				extra: { nodeName: node.name },
			});
		} else if (nodeType.webhook === undefined) {
			throw new ApplicationError('Node does not have any webhooks defined', {
				extra: { nodeName: node.name },
			});
		}

		const closeFunctions: CloseFunction[] = [];

		const context = nodeExecuteFunctions.getExecuteWebhookFunctions(
			this,
			node,
			additionalData,
			mode,
			webhookData,
			closeFunctions,
		);
		return nodeType instanceof Node
			? await nodeType.webhook(context)
			: await nodeType.webhook.call(context);
	}

	/**
	 * Executes the given node.
	 *
	 */
	// eslint-disable-next-line complexity
	async runNode(
		executionData: IExecuteData,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeExecuteFunctions: INodeExecuteFunctions,
		mode: WorkflowExecuteMode,
		abortSignal?: AbortSignal,
	): Promise<IRunNodeResponse> {
		const { node } = executionData;
		let inputData = executionData.data;

		if (node.disabled === true) {
			// If node is disabled simply pass the data through
			// return NodeRunHelpers.
			if (inputData.hasOwnProperty('main') && inputData.main.length > 0) {
				// If the node is disabled simply return the data from the first main input
				if (inputData.main[0] === null) {
					return { data: undefined };
				}
				return { data: [inputData.main[0]] };
			}
			return { data: undefined };
		}

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType === undefined) {
			throw new ApplicationError('Node type is unknown so cannot run it', {
				tags: { nodeType: node.type },
			});
		}

		let connectionInputData: INodeExecutionData[] = [];
		if (nodeType.execute || (!nodeType.poll && !nodeType.trigger && !nodeType.webhook)) {
			// Only stop if first input is empty for execute runs. For all others run anyways
			// because then it is a trigger node. As they only pass data through and so the input-data
			// becomes output-data it has to be possible.

			if (inputData.main?.length > 0) {
				// We always use the data of main input and the first input for execute
				connectionInputData = inputData.main[0] as INodeExecutionData[];
			}

			const forceInputNodeExecution = this.settings.executionOrder !== 'v1';
			if (!forceInputNodeExecution) {
				// If the nodes do not get force executed data of some inputs may be missing
				// for that reason do we use the data of the first one that contains any
				for (const mainData of inputData.main) {
					if (mainData?.length) {
						connectionInputData = mainData;
						break;
					}
				}
			}

			if (connectionInputData.length === 0) {
				// No data for node so return
				return { data: undefined };
			}
		}

		if (
			runExecutionData.resultData.lastNodeExecuted === node.name &&
			runExecutionData.resultData.error !== undefined
		) {
			// The node did already fail. So throw an error here that it displays and logs it correctly.
			// Does get used by webhook and trigger nodes in case they throw an error that it is possible
			// to log the error and display in Editor-UI.
			if (
				runExecutionData.resultData.error.name === 'NodeOperationError' ||
				runExecutionData.resultData.error.name === 'NodeApiError'
			) {
				throw runExecutionData.resultData.error;
			}

			const error = new Error(runExecutionData.resultData.error.message);
			error.stack = runExecutionData.resultData.error.stack;
			throw error;
		}

		if (node.executeOnce === true) {
			// If node should be executed only once so use only the first input item
			const newInputData: ITaskDataConnections = {};
			for (const inputName of Object.keys(inputData)) {
				newInputData[inputName] = inputData[inputName].map((input) => {
					// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
					return input && input.slice(0, 1);
				});
			}
			inputData = newInputData;
		}

		if (nodeType.execute) {
			const closeFunctions: CloseFunction[] = [];
			const context = nodeExecuteFunctions.getExecuteFunctions(
				this,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				node,
				additionalData,
				executionData,
				mode,
				closeFunctions,
				abortSignal,
			);
			const data =
				nodeType instanceof Node
					? await nodeType.execute(context)
					: await nodeType.execute.call(context);

			const closeFunctionsResults = await Promise.allSettled(
				closeFunctions.map(async (fn) => await fn()),
			);

			const closingErrors = closeFunctionsResults
				.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
				.map((result) => result.reason);

			if (closingErrors.length > 0) {
				if (closingErrors[0] instanceof Error) throw closingErrors[0];
				throw new ApplicationError("Error on execution node's close function(s)", {
					extra: { nodeName: node.name },
					tags: { nodeType: node.type },
					cause: closingErrors,
				});
			}

			return { data };
		} else if (nodeType.poll) {
			if (mode === 'manual') {
				// In manual mode run the poll function
				const thisArgs = nodeExecuteFunctions.getExecutePollFunctions(
					this,
					node,
					additionalData,
					mode,
					'manual',
				);
				return { data: await nodeType.poll.call(thisArgs) };
			}
			// In any other mode pass data through as it already contains the result of the poll
			return { data: inputData.main as INodeExecutionData[][] };
		} else if (nodeType.trigger) {
			if (mode === 'manual') {
				// In manual mode start the trigger
				const triggerResponse = await this.runTrigger(
					node,
					nodeExecuteFunctions.getExecuteTriggerFunctions,
					additionalData,
					mode,
					'manual',
				);

				if (triggerResponse === undefined) {
					return { data: null };
				}

				if (triggerResponse.manualTriggerFunction !== undefined) {
					// If a manual trigger function is defined call it and wait till it did run
					await triggerResponse.manualTriggerFunction();
				}

				const response = await triggerResponse.manualTriggerResponse!;

				let closeFunction;
				if (triggerResponse.closeFunction) {
					// In manual mode we return the trigger closeFunction. That allows it to be called directly
					// but we do not have to wait for it to finish. That is important for things like queue-nodes.
					// There the full close will may be delayed till a message gets acknowledged after the execution.
					// If we would not be able to wait for it to close would it cause problems with "own" mode as the
					// process would be killed directly after it and so the acknowledge would not have been finished yet.
					closeFunction = triggerResponse.closeFunction;
				}

				if (response.length === 0) {
					return { data: null, closeFunction };
				}

				return { data: response, closeFunction };
			}
			// For trigger nodes in any mode except "manual" do we simply pass the data through
			return { data: inputData.main as INodeExecutionData[][] };
		} else if (nodeType.webhook) {
			// For webhook nodes always simply pass the data through
			return { data: inputData.main as INodeExecutionData[][] };
		} else {
			// For nodes which have routing information on properties

			const routingNode = new RoutingNode(
				this,
				node,
				connectionInputData,
				runExecutionData ?? null,
				additionalData,
				mode,
			);

			return {
				data: await routingNode.runNode(
					inputData,
					runIndex,
					nodeType,
					executionData,
					nodeExecuteFunctions,
					undefined,
					abortSignal,
				),
			};
		}
	}
}

function hasDotNotationBannedChar(nodeName: string) {
	const DOT_NOTATION_BANNED_CHARS = /^(\d)|[\\ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~]/g;

	return DOT_NOTATION_BANNED_CHARS.test(nodeName);
}

function backslashEscape(nodeName: string) {
	const BACKSLASH_ESCAPABLE_CHARS = /[.*+?^${}()|[\]\\]/g;

	return nodeName.replace(BACKSLASH_ESCAPABLE_CHARS, (char) => `\\${char}`);
}

function dollarEscape(nodeName: string) {
	return nodeName.replace(new RegExp('\\$', 'g'), '$$$$');
}
