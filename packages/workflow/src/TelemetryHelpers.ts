/* eslint-disable import/no-cycle */
import {
	IConnection,
	INode,
	INodeNameIndex,
	INodesGraph,
	INodeGraphItem,
	INodesGraphResult,
	IWorkflowBase,
	INodeTypes,
} from '.';

import { getInstance as getLoggerInstance } from './LoggerProxy';

export function getNodeTypeForName(workflow: IWorkflowBase, nodeName: string): INode | undefined {
	return workflow.nodes.find((node) => node.name === nodeName);
}

export function generateNodesGraph(
	workflow: IWorkflowBase,
	nodeTypes: INodeTypes,
): INodesGraphResult {
	const nodesGraph: INodesGraph = {
		node_types: [],
		node_connections: [],
		nodes: {},
	};
	const nodeNameAndIndex: INodeNameIndex = {};

	try {
		workflow.nodes.forEach((node: INode, index: number) => {
			nodesGraph.node_types.push(node.type);
			const nodeItem: INodeGraphItem = {
				type: node.type,
				position: node.position,
			};

			if (node.type === 'n8n-nodes-base.httpRequest') {
				try {
					nodeItem.domain = new URL(node.parameters.url as string).hostname;
				} catch (e) {
					nodeItem.domain = node.parameters.url as string;
				}
			} else {
				const nodeType = nodeTypes.getByNameAndVersion(node.type);

				nodeType?.description.properties.forEach((property) => {
					if (
						property.name === 'operation' ||
						property.name === 'resource' ||
						property.name === 'mode'
					) {
						nodeItem[property.name] = property.default ? property.default.toString() : undefined;
					}
				});

				nodeItem.operation = node.parameters.operation?.toString() ?? nodeItem.operation;
				nodeItem.resource = node.parameters.resource?.toString() ?? nodeItem.resource;
				nodeItem.mode = node.parameters.mode?.toString() ?? nodeItem.mode;
			}
			nodesGraph.nodes[`${index}`] = nodeItem;
			nodeNameAndIndex[node.name] = index.toString();
		});

		const getGraphConnectionItem = (startNode: string, connectionItem: IConnection) => {
			return { start: nodeNameAndIndex[startNode], end: nodeNameAndIndex[connectionItem.node] };
		};

		Object.keys(workflow.connections).forEach((nodeName) => {
			const connections = workflow.connections[nodeName];
			connections.main.forEach((element) => {
				element.forEach((element2) => {
					nodesGraph.node_connections.push(getGraphConnectionItem(nodeName, element2));
				});
			});
		});
	} catch (e) {
		const logger = getLoggerInstance();
		logger.warn(`Failed to generate nodes graph for workflowId: ${workflow.id as string | number}`);
		logger.warn((e as Error).message);
		logger.warn((e as Error).stack ?? '');
	}

	return { nodeGraph: nodesGraph, nameIndices: nodeNameAndIndex };
}
