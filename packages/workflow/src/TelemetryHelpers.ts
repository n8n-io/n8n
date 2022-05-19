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
import { INodeType } from './Interfaces';

import { getInstance as getLoggerInstance } from './LoggerProxy';

const STICKY_NODE_TYPE = 'n8n-nodes-base.stickyNote';

export function getNodeTypeForName(workflow: IWorkflowBase, nodeName: string): INode | undefined {
	return workflow.nodes.find((node) => node.name === nodeName);
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number';
}

function getStickyDimensions(note: INode, stickyType: INodeType | undefined) {
	const heightProperty = stickyType?.description.properties.find(
		(property) => property.name === 'height',
	);
	const widthProperty = stickyType?.description.properties.find(
		(property) => property.name === 'width',
	);

	const defaultHeight =
		heightProperty && isNumber(heightProperty?.default) ? heightProperty.default : 0;
	const defaultWidth =
		widthProperty && isNumber(widthProperty?.default) ? widthProperty.default : 0;

	const height: number = isNumber(note.parameters.height) ? note.parameters.height : defaultHeight;
	const width: number = isNumber(note.parameters.width) ? note.parameters.width : defaultWidth;

	return {
		height,
		width,
	};
}

type XYPosition = [number, number];

function areOverlapping(
	topLeft: XYPosition,
	bottomRight: XYPosition,
	targetPos: XYPosition,
): boolean {
	return (
		targetPos[0] > topLeft[0] &&
		targetPos[1] > topLeft[1] &&
		targetPos[0] < bottomRight[0] &&
		targetPos[1] < bottomRight[1]
	);
}

export function generateNodesGraph(
	workflow: IWorkflowBase,
	nodeTypes: INodeTypes,
): INodesGraphResult {
	const nodesGraph: INodesGraph = {
		node_types: [],
		node_connections: [],
		nodes: {},
		notes: {},
	};
	const nodeNameAndIndex: INodeNameIndex = {};

	try {
		const notes = workflow.nodes.filter((node) => node.type === STICKY_NODE_TYPE);
		const otherNodes = workflow.nodes.filter((node) => node.type !== STICKY_NODE_TYPE);

		notes.forEach((stickyNote: INode, index: number) => {
			const stickyType = nodeTypes.getByNameAndVersion(STICKY_NODE_TYPE, stickyNote.typeVersion);
			const { height, width } = getStickyDimensions(stickyNote, stickyType);

			const topLeft = stickyNote.position;
			const bottomRight: [number, number] = [topLeft[0] + width, topLeft[1] + height];
			const overlapping = Boolean(
				otherNodes.find((node) => areOverlapping(topLeft, bottomRight, node.position)),
			);
			nodesGraph.notes[index] = {
				overlapping,
				position: topLeft,
				height,
				width,
			};
		});

		otherNodes.forEach((node: INode, index: number) => {
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
