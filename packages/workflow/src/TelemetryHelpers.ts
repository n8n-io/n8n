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

const URL_PARTS_REGEX = /(?<protocolPlusDomain>.*?\..*?)(?<pathname>\/.*)/;

export function getDomainBase(raw: string, urlParts = URL_PARTS_REGEX): string {
	try {
		const url = new URL(raw);

		return [url.protocol, url.hostname].join('//');
	} catch (_) {
		const match = urlParts.exec(raw);

		if (!match?.groups?.protocolPlusDomain) return '';

		return match.groups.protocolPlusDomain;
	}
}

function isSensitive(segment: string) {
	if (/^v\d+$/.test(segment)) return false;

	return /%40/.test(segment) || /\d/.test(segment) || /^[0-9A-F]{8}/i.test(segment);
}

export const ANONYMIZATION_CHARACTER = '*';

function sanitizeRoute(raw: string, check = isSensitive, char = ANONYMIZATION_CHARACTER) {
	return raw
		.split('/')
		.map((segment) => (check(segment) ? char.repeat(segment.length) : segment))
		.join('/');
}

/**
 * Return pathname plus query string from URL, anonymizing IDs in route and query params.
 */
export function getDomainPath(raw: string, urlParts = URL_PARTS_REGEX): string {
	try {
		const url = new URL(raw);

		if (!url.hostname) throw new Error('Malformed URL');

		return sanitizeRoute(url.pathname);
	} catch (_) {
		const match = urlParts.exec(raw);

		if (!match?.groups?.pathname) return '';

		// discard query string
		const route = match.groups.pathname.split('?').shift() as string;

		return sanitizeRoute(route);
	}
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
		is_pinned: Object.keys(workflow.pinData ?? {}).length > 0,
	};
	const nodeNameAndIndex: INodeNameIndex = {};
	const webhookNodeNames: string[] = [];

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

			if (node.type === 'n8n-nodes-base.httpRequest' && node.typeVersion === 1) {
				try {
					nodeItem.domain = new URL(node.parameters.url as string).hostname;
				} catch (_) {
					nodeItem.domain = getDomainBase(node.parameters.url as string);
				}
			} else if (node.type === 'n8n-nodes-base.httpRequest' && node.typeVersion === 2) {
				const { authentication } = node.parameters as { authentication: string };

				nodeItem.credential_type = {
					none: 'none',
					genericCredentialType: node.parameters.genericAuthType as string,
					existingCredentialType: node.parameters.nodeCredentialType as string,
				}[authentication];

				nodeItem.credential_set = node.credentials
					? Object.keys(node.credentials).length > 0
					: false;

				const { url } = node.parameters as { url: string };

				nodeItem.domain_base = getDomainBase(url);
				nodeItem.domain_path = getDomainPath(url);
				nodeItem.method = node.parameters.requestMethod as string;
			} else if (node.type === 'n8n-nodes-base.webhook') {
				webhookNodeNames.push(node.name);
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
	} catch (_) {
		return { nodeGraph: nodesGraph, nameIndices: nodeNameAndIndex, webhookNodeNames };
	}

	return { nodeGraph: nodesGraph, nameIndices: nodeNameAndIndex, webhookNodeNames };
}
