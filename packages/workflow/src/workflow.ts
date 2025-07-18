/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-for-in-array */
import {
	MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE,
	NODES_WITH_RENAMABLE_CONTENT,
	NODES_WITH_RENAMABLE_FORM_HTML_CONTENT,
	NODES_WITH_RENAMEABLE_TOPLEVEL_HTML_CONTENT,
	STARTING_NODE_TYPES,
} from './constants';
import { UserError } from './errors';
import { ApplicationError } from './errors/application.error';
import { Expression } from './expression';
import { getGlobalState } from './global-state';
import type {
	IConnections,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodes,
	INodeType,
	INodeTypes,
	IPinData,
	IWorkflowSettings,
	IConnection,
	IConnectedNode,
	IDataObject,
	INodeConnection,
	IObservableObject,
	NodeParameterValueType,
	INodeOutputConfiguration,
	NodeConnectionType,
} from './interfaces';
import { NodeConnectionTypes } from './interfaces';
import * as NodeHelpers from './node-helpers';
import { renameFormFields } from './node-parameters/rename-node-utils';
import { applyAccessPatterns } from './node-reference-parser-utils';
import * as ObservableObject from './observable-object';

function dedupe<T>(arr: T[]): T[] {
	return [...new Set(arr)];
}

export interface WorkflowParameters {
	id?: string;
	name?: string;
	nodes: INode[];
	connections: IConnections;
	active: boolean;
	nodeTypes: INodeTypes;
	staticData?: IDataObject;
	settings?: IWorkflowSettings;
	pinData?: IPinData;
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

	readonly timezone: string;

	// To save workflow specific static data like for example
	// ids of registered webhooks of nodes
	staticData: IDataObject;

	testStaticData: IDataObject | undefined;

	pinData?: IPinData;

	constructor(parameters: WorkflowParameters) {
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
				nodeType.description,
			);
			node.parameters = nodeParameters !== null ? nodeParameters : {};
		}
		this.connectionsBySourceNode = parameters.connections;

		// Save also the connections by the destination nodes
		this.connectionsByDestinationNode = Workflow.getConnectionsByDestination(
			parameters.connections,
		);

		this.active = parameters.active || false;

		this.staticData = ObservableObject.create(parameters.staticData || {}, undefined, {
			ignoreEmptyOnFirstChild: true,
		});

		this.settings = parameters.settings || {};
		this.timezone = this.settings.timezone ?? getGlobalState().defaultTimezone;

		this.expression = new Expression(this);
	}

	overrideStaticData(staticData?: IDataObject) {
		this.staticData = ObservableObject.create(staticData || {}, undefined, {
			ignoreEmptyOnFirstChild: true,
		});
		this.staticData.__dataChanged = true;
	}

	/**
	 * The default connections are by source node. This function rewrites them by destination nodes
	 * to easily find parent nodes.
	 *
	 */
	static getConnectionsByDestination(connections: IConnections): IConnections {
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

					for (connectionInfo of connections[sourceNode][type][inputIndex] ?? []) {
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

						returnConnection[connectionInfo.node][connectionInfo.type][connectionInfo.index]?.push({
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
	 * Returns the nodes with the given names if they exist.
	 * If a node cannot be found it will be ignored, meaning the returned array
	 * of nodes can be smaller than the array of names.
	 */
	getNodes(nodeNames: string[]): INode[] {
		const nodes: INode[] = [];
		for (const name of nodeNames) {
			const node = this.getNode(name);
			if (!node) {
				console.warn(
					`Could not find a node with the name ${name} in the workflow. This was passed in as a dirty node name.`,
				);
				continue;
			}
			nodes.push(node);
		}

		return nodes;
	}

	/**
	 * Returns the pinData of the node with the given name if it exists
	 *
	 * @param {string} nodeName Name of the node to return the pinData of
	 */
	getPinDataOfNode(nodeName: string): INodeExecutionData[] | undefined {
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
				parameterValue = applyAccessPatterns(parameterValue, currentName, newName);
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
		// These keys are excluded to prevent accidental modification of inherited properties and
		// to avoid any issues related to JavaScript's built-in methods that can cause unexpected behavior
		const restrictedKeys = [
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'toLocaleString',
			'toString',
			'valueOf',
			'constructor',
			'prototype',
			'__proto__',
			'__defineGetter__',
			'__defineSetter__',
			'__lookupGetter__',
			'__lookupSetter__',
		];

		if (restrictedKeys.map((k) => k.toLowerCase()).includes(newName.toLowerCase())) {
			throw new UserError(`Node name "${newName}" is a restricted name.`, {
				description: `Node names cannot be any of the following: ${restrictedKeys.join(', ')}`,
			});
		}
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
			if (NODES_WITH_RENAMEABLE_TOPLEVEL_HTML_CONTENT.has(node.type)) {
				node.parameters.html = this.renameNodeInParameterValue(
					node.parameters.html,
					currentName,
					newName,
					{ hasRenamableContent: true },
				);
			}
			if (NODES_WITH_RENAMABLE_FORM_HTML_CONTENT.has(node.type)) {
				renameFormFields(node, (p) =>
					this.renameNodeInParameterValue(p, currentName, newName, {
						hasRenamableContent: true,
					}),
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
		let connectionData: IConnection | undefined;
		for (sourceNode of Object.keys(this.connectionsBySourceNode)) {
			for (type of Object.keys(this.connectionsBySourceNode[sourceNode])) {
				for (sourceIndex of Object.keys(this.connectionsBySourceNode[sourceNode][type])) {
					for (connectionIndex of Object.keys(
						this.connectionsBySourceNode[sourceNode][type][parseInt(sourceIndex, 10)] || [],
					)) {
						connectionData =
							this.connectionsBySourceNode[sourceNode][type][parseInt(sourceIndex, 10)]?.[
								parseInt(connectionIndex, 10)
							];
						if (connectionData?.node === currentName) {
							connectionData.node = newName;
						}
					}
				}
			}
		}

		// Use the updated connections to create updated connections by destination nodes
		this.connectionsByDestinationNode = Workflow.getConnectionsByDestination(
			this.connectionsBySourceNode,
		);
	}

	/**
	 * Finds the highest parent nodes of the node with the given name
	 *
	 * @param {NodeConnectionType} [type='main']
	 */
	getHighestNode(
		nodeName: string,
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

		if (!this.connectionsByDestinationNode[nodeName].hasOwnProperty(NodeConnectionTypes.Main)) {
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

		let connectionsByIndex: IConnection[] | null;
		for (
			let connectionIndex = 0;
			connectionIndex <
			this.connectionsByDestinationNode[nodeName][NodeConnectionTypes.Main].length;
			connectionIndex++
		) {
			if (nodeConnectionIndex !== undefined && nodeConnectionIndex !== connectionIndex) {
				// If a connection-index is given ignore all other ones
				continue;
			}
			connectionsByIndex =
				this.connectionsByDestinationNode[nodeName][NodeConnectionTypes.Main][connectionIndex];

			connectionsByIndex?.forEach((connection) => {
				if (checkedNodes.includes(connection.node)) {
					// Node got checked already before
					return;
				}

				// Ignore connections for nodes that don't exist in this workflow
				if (!(connection.node in this.nodes)) return;

				addNodes = this.getHighestNode(connection.node, undefined, checkedNodes);

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
		type: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN' = NodeConnectionTypes.Main,
		depth = -1,
	): string[] {
		return this.getConnectedNodes(this.connectionsBySourceNode, nodeName, type, depth);
	}

	/**
	 * Returns all the nodes before the given one
	 *
	 * @param {NodeConnectionType} [type='main']
	 * @param {*} [depth=-1]
	 */
	getParentNodes(
		nodeName: string,
		type: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN' = NodeConnectionTypes.Main,
		depth = -1,
	): string[] {
		return this.getConnectedNodes(this.connectionsByDestinationNode, nodeName, type, depth);
	}

	/**
	 * Gets all the nodes which are connected nodes starting from
	 * the given one
	 *
	 * @param {NodeConnectionType} [type='main']
	 * @param {*} [depth=-1]
	 */
	getConnectedNodes(
		connections: IConnections,
		nodeName: string,
		connectionType: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN' = NodeConnectionTypes.Main,
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

		let types: NodeConnectionType[];
		if (connectionType === 'ALL') {
			types = Object.keys(connections[nodeName]) as NodeConnectionType[];
		} else if (connectionType === 'ALL_NON_MAIN') {
			types = Object.keys(connections[nodeName]).filter(
				(type) => type !== 'main',
			) as NodeConnectionType[];
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
				connectionsByIndex?.forEach((connection) => {
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

		const type: NodeConnectionType = NodeConnectionTypes.Main;
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
					connectionsByIndex?.forEach((connection) => {
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
				outputs.find(
					(output) =>
						((output as INodeOutputConfiguration)?.type ?? output) !== NodeConnectionTypes.Main,
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
		type: NodeConnectionType = NodeConnectionTypes.Main,
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
			if (!connectionsByIndex) {
				continue;
			}

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

		if (nodeNames.length === 1) {
			node = this.nodes[nodeNames[0]];
			if (node && !node.disabled) {
				return node;
			}
		}

		for (const nodeName of nodeNames) {
			node = this.nodes[nodeName];
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

	getConnectionsBetweenNodes(
		sources: string[],
		targets: string[],
	): Array<[IConnection, IConnection]> {
		const result: Array<[IConnection, IConnection]> = [];

		for (const source of sources) {
			for (const type of Object.keys(this.connectionsBySourceNode[source] ?? {})) {
				for (const sourceIndex of Object.keys(this.connectionsBySourceNode[source][type])) {
					for (const connectionIndex of Object.keys(
						this.connectionsBySourceNode[source][type][parseInt(sourceIndex, 10)] ?? [],
					)) {
						const targetConnectionData =
							this.connectionsBySourceNode[source][type][parseInt(sourceIndex, 10)]?.[
								parseInt(connectionIndex, 10)
							];
						if (targetConnectionData && targets.includes(targetConnectionData?.node)) {
							result.push([
								{
									node: source,
									index: parseInt(sourceIndex, 10),
									type: type as NodeConnectionType,
								},
								targetConnectionData,
							]);
						}
					}
				}
			}
		}

		return result;
	}
}
