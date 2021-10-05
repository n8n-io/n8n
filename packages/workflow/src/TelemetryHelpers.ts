/* eslint-disable import/no-cycle */
import {
	IConnection,
	INode,
	INodeNameIndex,
	INodesGraph,
	INodeGraphItem,
	INodesGraphResult,
	IWorkflowBase,
} from '.';

export function getNodeTypeForName(workflow: IWorkflowBase, nodeName: string): INode | undefined {
	return workflow.nodes.find((node) => node.name === nodeName);
}

export function generateNodesGraph(workflow: IWorkflowBase): INodesGraphResult {
	const nodesGraph: INodesGraph = {
		node_types: [],
		node_connections: [],
		nodes: {},
	};
	const nodeNameAndIndex: INodeNameIndex = {};

	workflow.nodes.forEach((node: INode, index: number) => {
		nodesGraph.node_types.push(node.type);
		const nodeItem: INodeGraphItem = {
			type: node.type,
		};

		if (node.type === 'n8n-nodes-base.httpRequest') {
			try {
				nodeItem.domain = new URL(node.parameters.url as string).hostname;
			} catch (e) {
				nodeItem.domain = node.parameters.url as string;
			}
		} else {
			Object.keys(node.parameters).forEach((parameterName) => {
				if (parameterName === 'operation' || parameterName === 'resource') {
					nodeItem[parameterName] = node.parameters[parameterName] as string;
				}
			});
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

	return { nodeGraph: nodesGraph, nameIndices: nodeNameAndIndex };
}
