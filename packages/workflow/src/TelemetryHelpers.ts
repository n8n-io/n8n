/* eslint-disable import/no-cycle */
import {
	IConnection,
	INode,
	INodeConnections,
	INodeNameIndex,
	INodesGraph,
	INodeGraphItem,
	INodesGraphResult,
	IWorkflowBase,
} from '.';

export function getNodeTypeForName(workflow: IWorkflowBase, nodeName: string): INode | undefined {
	return workflow.nodes.find((node: INode) => node.name === nodeName);
}

export function generateNodesGraph(workflow: IWorkflowBase): INodesGraphResult {
	const nodesGraph: INodesGraph = {
		node_types: [],
		node_connections: [],
		nodes: {},
	};
	const nodeNameAndInd: INodeNameIndex = {};

	workflow.nodes.forEach((node: INode, index: number) => {
		nodesGraph.node_types.push(node.type);
		const nodeItem: INodeGraphItem = {
			type: node.type,
		};

		if (node.type === 'n8n-nodes-base.httpRequest') {
			let hostname = '';
			if (node.parameters.url) {
				({ hostname } = new URL((node.parameters.url as string) ?? ''));
			}
			nodeItem.domain = hostname;
		} else {
			Object.keys(node.parameters).forEach((parameterName) => {
				if (parameterName === 'operation' || parameterName === 'resource') {
					nodeItem[parameterName] = node.parameters[parameterName] as string;
				}
			});
		}
		nodesGraph.nodes[`${index}`] = nodeItem;
		nodeNameAndInd[node.name] = index.toString();
	});

	const getGraphConnectionItem = (startNode: string, connectionItem: IConnection) => {
		return { start: nodeNameAndInd[startNode], end: nodeNameAndInd[connectionItem.node] };
	};

	Object.keys(workflow.connections).forEach((nodeName) => {
		const connections: INodeConnections = workflow.connections[nodeName];
		connections.main.forEach((element: IConnection[]) => {
			element.forEach((element2) => {
				nodesGraph.node_connections.push(getGraphConnectionItem(nodeName, element2));
			});
		});
	});

	return { nodeGraph: nodesGraph, nameIndices: nodeNameAndInd };
}
